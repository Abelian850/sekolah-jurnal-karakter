import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { users, roles, teachers, students } from "@sjk/api/src/db/schema";
import type { Role } from "@sjk/shared";
import { verifyPassword } from "@sjk/shared";

/**
 * Mencari schoolId pengguna sesuai role-nya.
 * Catatan desain (asumsi Fase 3): tabel `users` sendiri tidak memiliki
 * kolom schoolId - schoolId hanya melekat pada profil `teachers` dan
 * `students`. Untuk Admin & Kepala Sekolah, penugasan ke sekolah tertentu
 * belum dimodelkan di Fase 1-2 (mereka bisa mengelola lintas sekolah jika
 * yayasan punya lebih dari satu). schoolId untuk kedua role tersebut
 * dikembalikan `null` untuk saat ini; jika ke depannya dibutuhkan
 * pembatasan Admin per sekolah, tambahkan tabel relasi `user_school` di
 * Fase 4 mengikuti pola `teacher_student`.
 */
async function resolveSchoolId(
  db: ReturnType<typeof drizzle>,
  userId: string,
  role: Role
): Promise<string | null> {
  if (role === "guru_wali" || role === "guru") {
    const [row] = await db
      .select({ schoolId: teachers.schoolId })
      .from(teachers)
      .where(eq(teachers.userId, userId))
      .limit(1);
    return row?.schoolId ?? null;
  }
  if (role === "peserta_didik") {
    const [row] = await db
      .select({ schoolId: students.schoolId })
      .from(students)
      .where(eq(students.userId, userId))
      .limit(1);
    return row?.schoolId ?? null;
  }
  return null;
}

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
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata Sandi", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const sql = neon(process.env.DATABASE_URL as string);
        const db = drizzle(sql);

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
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!row || !row.isActive) return null;

import { verifyPassword } from "@sjk/shared";
        const passwordValid = await verifyPassword(password, row.passwordHash);
        if (!passwordValid) return null;

        const schoolId = await resolveSchoolId(db, row.id, row.roleName as Role);

        return {
          id: row.id,
          email: row.email,
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
