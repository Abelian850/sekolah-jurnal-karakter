import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, gte, sql } from "drizzle-orm";
import { users, roles, teachers, students, principals, auditLogs } from "@sjk/api/src/db/schema";
import type { Role } from "@sjk/shared";
import { verifyPassword } from "@sjk/shared";

/**
 * Mencari schoolId pengguna sesuai role-nya.
 * Catatan desain (asumsi Fase 3): tabel `users` sendiri tidak memiliki
 * kolom schoolId - schoolId hanya melekat pada profil `teachers` dan
 * `students`. Untuk Admin & Kepala Sekolah, penugasan ke sekolah tertentu
 * belum dimodelkan di Fase 1-2 (mereka bisa mengelola lintas sekolah jika
 * yayasan punya lebih dari satu). schoolId untuk kedua role tersebut
 * dikembalikan `null` untuk saat ini.
 * Pembaruan Fase 7: Kepala Sekolah kini punya profil `principals`
 * (userId -> schoolId) sehingga schoolId-nya ikut terisi di JWT dan
 * endpoint analytics dapat membatasi data per sekolah. Admin tetap
 * lintas sekolah (null).
 * Revisi Juli 2026: sekalian mengambil fullName dari tabel profil agar
 * UI (topbar) bisa menyapa dengan nama, bukan email internal. Admin
 * tidak punya tabel profil - fullName null, UI fallback ke email.
 */
async function resolveProfile(
  db: ReturnType<typeof drizzle>,
  userId: string,
  role: Role
): Promise<{ schoolId: string | null; fullName: string | null }> {
  if (role === "guru_wali" || role === "guru") {
    const [row] = await db
      .select({ schoolId: teachers.schoolId, fullName: teachers.fullName })
      .from(teachers)
      .where(eq(teachers.userId, userId))
      .limit(1);
    return { schoolId: row?.schoolId ?? null, fullName: row?.fullName ?? null };
  }
  if (role === "peserta_didik") {
    const [row] = await db
      .select({ schoolId: students.schoolId, fullName: students.fullName })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);
    return { schoolId: row?.schoolId ?? null, fullName: row?.fullName ?? null };
  }
  if (role === "kepala_sekolah") {
    const [row] = await db
      .select({ schoolId: principals.schoolId, fullName: principals.fullName })
      .from(principals)
      .where(eq(principals.userId, userId))
      .limit(1);
    return { schoolId: row?.schoolId ?? null, fullName: row?.fullName ?? null };
  }
  return { schoolId: null, fullName: null };
}

/**
 * Rate limiting login (Fase 9 — hardening).
 *
 * Disimpan di tabel `audit_logs` (action "login_failed"), BUKAN di memori,
 * karena Cloudflare Workers menjalankan banyak isolate paralel yang tidak
 * berbagi memori — counter in-memory mudah di-bypass. Jendela hitung 15
 * menit; melewati batas membuat authorize() menolak TANPA menjalankan
 * verifikasi argon2 (hemat CPU + menutup brute force).
 *
 * Dua lapis batas:
 * - per-akun  : 5 kegagalan / 15 menit — melindungi satu akun yang ditarget.
 * - per-IP    : 20 kegagalan / 15 menit — menahan credential stuffing lintas
 *               akun; longgar agar satu sekolah di balik NAT (satu IP publik)
 *               tidak saling mengunci hanya karena beberapa siswa salah ketik.
 *
 * Kegagalan MEMBACA counter sengaja fail-open (login tetap diproses) agar
 * gangguan DB tidak mengunci semua pengguna; kegagalan MENULIS log tidak
 * pernah mengubah hasil login (pola yang sama dengan audit login sukses).
 */
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_PER_USER = 5;
const MAX_FAILED_PER_IP = 20;

/**
 * Auth.js (next-auth v5) dikonfigurasi dengan strategi JWT (bukan database
 * session), karena JWT inilah yang dikirim sebagai Bearer token ke backend
 * Hono di Cloudflare Workers untuk diverifikasi ulang (lihat
 * apps/api/src/middleware/auth.ts). AUTH_SECRET di sini WAJIB identik
 * dengan AUTH_SECRET yang di-set di Workers via `wrangler secret put`.
 *
 * Password di-hash dengan argon2id (lihat lib/password.ts) dan dicocokkan
 * di sini menggunakan koneksi Neon HTTP driver (aman dipakai di edge runtime).
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  // WAJIB di luar Vercel (Cloudflare Workers): tanpa ini Auth.js melempar
  // UntrustedHost dan SEMUA halaman ber-auth() menampilkan "Server error -
  // There is a problem with the server configuration". Aman di sini karena
  // request selalu lewat proxy Cloudflare yang menetapkan header Host.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email / NISN / NIP", type: "text" },
        password: { label: "Kata Sandi", type: "password" },
      },
      authorize: async (credentials, request) => {
        const identifier = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!identifier || !password) return null;

        const neonSql = neon(process.env.DATABASE_URL as string);
        const db = drizzle(neonSql);

        // IP diambil di awal karena dipakai rate limiting DAN audit log.
        const ipAddress =
          request?.headers?.get?.("cf-connecting-ip") ??
          request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;
        const windowStart = new Date(Date.now() - LOGIN_RATE_WINDOW_MS);

        // Catat kegagalan login. userId null = identifier tidak dikenal
        // (tetap dihitung per-IP). Gagal-tulis ditelan — lihat komentar
        // di konstanta LOGIN_RATE_* di atas.
        const logFailedLogin = async (userId: string | null) => {
          try {
            await db.insert(auditLogs).values({
              userId,
              action: "login_failed",
              tableName: "users",
              recordId: userId,
              ipAddress,
            });
          } catch {
            // Sengaja ditelan.
          }
        };

        // ---- Rate limit per-IP (sebelum query user apa pun) ----
        try {
          if (ipAddress) {
            const [ipFails] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(auditLogs)
              .where(
                and(
                  eq(auditLogs.action, "login_failed"),
                  eq(auditLogs.ipAddress, ipAddress),
                  gte(auditLogs.createdAt, windowStart)
                )
              );
            if ((ipFails?.count ?? 0) >= MAX_FAILED_PER_IP) return null;
          }
        } catch {
          // Fail-open — lihat komentar di atas.
        }

        // Identifier tanpa "@" diperlakukan sebagai NISN siswa ATAU NIP guru
        // (pasca-Fase 6 siswa login dengan NISN; revisi Juli 2026 guru login
        // dengan NIP). Resolusi lewat tabel students lalu teachers (sumber
        // kebenaran), BUKAN dengan menebak email "<nisn>@siswa.internal" /
        // "<nip>@guru.internal", agar akun lama yang emailnya bukan format
        // internal tetap bisa login dengan NISN/NIP mereka. NISN dicek dulu
        // karena populasinya jauh lebih besar; tabrakan NISN vs NIP praktis
        // mustahil (NISN 10 digit vs NIP 18 digit).
        const email = identifier.includes("@") ? identifier.toLowerCase() : null;
        const trimmed = identifier.trim();

        let userId: string | null = null;
        if (!email) {
          const [studentRow] = await db
            .select({ userId: students.userId })
            .from(students)
            .where(eq(students.nisn, trimmed))
            .limit(1);
          if (studentRow) {
            userId = studentRow.userId;
          } else {
            const [teacherRow] = await db
              .select({ userId: teachers.userId })
              .from(teachers)
              .where(eq(teachers.nip, trimmed))
              .limit(1);
            if (!teacherRow) {
              await logFailedLogin(null);
              return null;
            }
            userId = teacherRow.userId;
          }
        }

        const [row] = await db
          .select({
            id: users.id,
            email: users.email,
            passwordHash: users.passwordHash,
            isActive: users.isActive,
            roleName: roles.name,
          })
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .where(email ? eq(users.email, email) : eq(users.id, userId as string))
          .limit(1);

        if (!row || !row.isActive) {
          await logFailedLogin(row?.id ?? null);
          return null;
        }

        // ---- Rate limit per-akun (sebelum verifikasi argon2) ----
        try {
          const [userFails] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(auditLogs)
            .where(
              and(
                eq(auditLogs.action, "login_failed"),
                eq(auditLogs.userId, row.id),
                gte(auditLogs.createdAt, windowStart)
              )
            );
          if ((userFails?.count ?? 0) >= MAX_FAILED_PER_USER) return null;
        } catch {
          // Fail-open — lihat komentar di atas.
        }

        const passwordValid = await verifyPassword(password, row.passwordHash);
        if (!passwordValid) {
          await logFailedLogin(row.id);
          return null;
        }

        const { schoolId, fullName } = await resolveProfile(
          db,
          row.id,
          row.roleName as Role
        );

        // Fase 9 (audit): catat login sukses — isi last_login_at + baris
        // audit_logs. Dibungkus try/catch agar KEGAGALAN pencatatan tidak
        // pernah menggagalkan login itu sendiri (mis. saat DB sesaat
        // menolak write); login tetap sah karena password sudah terverifikasi.
        try {
          await db
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, row.id));
          await db.insert(auditLogs).values({
            userId: row.id,
            action: "login",
            tableName: "users",
            recordId: row.id,
            // Tanpa old/new value: cukup jejak siapa-kapan-dari-IP-mana.
            ipAddress,
          });
        } catch {
          // Sengaja ditelan - lihat komentar di atas.
        }

        return {
          id: row.id,
          email: row.email,
          // Auth.js otomatis menyalin `name` ke token.name -> session.user.name.
          name: fullName,
          role: row.roleName as Role,
          schoolId,
        };
      },
    }),
  ],
  callbacks: {
    // Menyisipkan role & schoolId ke JWT saat login pertama kali.
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.schoolId = (user as { schoolId: string | null }).schoolId;
        token.sub = (user as { id: string }).id;
      }
      return token;
    },
    // Meneruskan role & schoolId ke object session agar bisa dipakai di
    // server component maupun saat minting token API (lib/api-token.ts).
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { role?: Role }).role = token.role as Role;
        (session.user as { schoolId?: string | null }).schoolId = token.schoolId as
          | string
          | null;
        (session.user as { id?: string }).id = token.sub as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
