import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { PERMISSIONS, nipToEmail, NIP_REGEX, hashPassword } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { teachers, users, auditLogs, teacherStudent, verifications } from "../db/schema";
import { createUserAccount, deleteUserAccount, getRoleId } from "../services/user-provisioning";
import type { Env, Variables } from "../index";

export const teachersRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * KONVENSI AKUN GURU (revisi Juli 2026, meniru konvensi siswa/NISN):
 * - NIP wajib & unik (5-30 digit angka, lihat NIP_REGEX di packages/shared).
 * - Login = NIP ATAU email; kata sandi awal = NIP.
 * - Email opsional; jika kosong dibuat otomatis nipToEmail(nip) ->
 *   "<nip>@guru.internal".
 * - Kata sandi dapat direset kembali ke NIP via PATCH /:id/reset-password.
 */
const teacherFields = {
  nip: z.string().regex(NIP_REGEX, "NIP harus berupa 5-30 digit angka"),
  fullName: z.string().min(3).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  isGuruWali: z.boolean().default(false),
};

const createTeacherSchema = z.object({ schoolId: z.string().uuid(), ...teacherFields });

/** Pesan error ramah saat NIP sudah terdaftar (cek dini sebelum insert). */
async function findTeacherByNip(db: Parameters<typeof createUserAccount>[0], nip: string) {
  const [row] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.nip, nip));
  return row;
}

teachersRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  async (c) => {
    const db = c.get("db");
    const schoolId = c.req.query("schoolId");

    const result = schoolId
      ? await db.select().from(teachers).where(eq(teachers.schoolId, schoolId))
      : await db.select().from(teachers);

    return c.json({ data: result });
  }
);

teachersRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  zValidator("json", createTeacherSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const body = c.req.valid("json");

    if (await findTeacherByNip(db, body.nip)) {
      return c.json(
        { error: "conflict", message: `NIP ${body.nip} sudah terdaftar`, statusCode: 409 },
        409
      );
    }

    // Role login mengikuti status wali: guru wali harus punya role
    // `guru_wali` agar diarahkan ke /dashboard/guru-wali dan mendapat
    // permission JOURNAL_VERIFY (lihat ROLE_PERMISSIONS di packages/shared).
    const user = await createUserAccount(db, {
      email: body.email ?? nipToEmail(body.nip),
      plainPassword: body.nip,
      roleName: body.isGuruWali ? "guru_wali" : "guru",
    });

    try {
      const [teacher] = await db
        .insert(teachers)
        .values({
          userId: user.id,
          schoolId: body.schoolId,
          nip: body.nip,
          fullName: body.fullName,
          phone: body.phone,
          isGuruWali: body.isGuruWali,
        })
        .returning();

      await db.insert(auditLogs).values({
        userId: admin.sub,
        action: "create",
        tableName: "teachers",
        recordId: teacher.id,
        newValue: teacher,
        ipAddress: c.req.header("cf-connecting-ip") ?? null,
      });

      return c.json({ data: teacher }, 201);
    } catch (err) {
      // Kompensasi manual: hapus user yang sudah terlanjur dibuat jika
      // insert profil teacher gagal (lihat catatan di user-provisioning.ts).
      await deleteUserAccount(db, user.id);
      throw err;
    }
  }
);

const bulkTeacherSchema = z.object({
  schoolId: z.string().uuid(),
  rows: z.array(z.object(teacherFields)).min(1).max(500),
});

/**
 * POST /teachers/bulk
 * Menerima array baris hasil parsing Excel dari frontend (lihat
 * apps/web/components/bulk-import-teachers.tsx yang mem-parsing file .xlsx
 * di browser dengan SheetJS, BUKAN di server - lihat catatan trade-off di
 * docs/bulk-import-export.md). Setiap baris diproses independen; baris yang
 * gagal tidak menggagalkan baris lain (bukan all-or-nothing), sesuai
 * batasan transaksi Neon HTTP driver yang sudah dijelaskan di
 * user-provisioning.ts. Ringkasan sukses/gagal dikembalikan per baris.
 *
 * Pasca-revisi Juli 2026: kolom email & password TIDAK wajib lagi -
 * akun dibuat dengan sandi awal = NIP, email otomatis dari NIP jika kosong.
 */
teachersRoute.post(
  "/bulk",
  authMiddleware,
  requirePermission(PERMISSIONS.BULK_IMPORT_EXPORT),
  zValidator("json", bulkTeacherSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const { schoolId, rows } = c.req.valid("json");

    const results: Array<{ row: number; success: boolean; message?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (await findTeacherByNip(db, row.nip)) {
          results.push({ row: i + 1, success: false, message: `NIP ${row.nip} sudah terdaftar` });
          continue;
        }

        const user = await createUserAccount(db, {
          email: row.email ?? nipToEmail(row.nip),
          plainPassword: row.nip,
          roleName: row.isGuruWali ? "guru_wali" : "guru",
        });

        try {
          const [teacher] = await db
            .insert(teachers)
            .values({
              userId: user.id,
              schoolId,
              nip: row.nip,
              fullName: row.fullName,
              phone: row.phone,
              isGuruWali: row.isGuruWali,
            })
            .returning();

          await db.insert(auditLogs).values({
            userId: admin.sub,
            action: "create",
            tableName: "teachers",
            recordId: teacher.id,
            newValue: teacher,
            ipAddress: c.req.header("cf-connecting-ip") ?? null,
          });
        } catch (err) {
          await deleteUserAccount(db, user.id);
          throw err;
        }

        results.push({ row: i + 1, success: true });
      } catch (err) {
        results.push({ row: i + 1, success: false, message: (err as Error).message });
      }
    }

    return c.json({ data: results });
  }
);

/**
 * PATCH /teachers/:id/reset-password - reset kata sandi guru kembali ke
 * NIP-nya. Untuk guru lama (dibuat sebelum konvensi login-NIP) atau guru
 * yang lupa kata sandi. Hanya Admin (TEACHER_MANAGE).
 */
teachersRoute.patch(
  "/:id/reset-password",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
    if (!teacher) {
      return c.json({ error: "not_found", message: "Guru tidak ditemukan", statusCode: 404 }, 404);
    }
    if (!teacher.nip) {
      return c.json(
        {
          error: "bad_request",
          message:
            "Guru ini belum memiliki NIP, jadi kata sandi tidak bisa direset ke NIP. Lengkapi NIP-nya dulu.",
          statusCode: 400,
        },
        400
      );
    }

    const passwordHash = await hashPassword(teacher.nip);
    await db.update(users).set({ passwordHash }).where(eq(users.id, teacher.userId));

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "reset_password",
      tableName: "users",
      recordId: teacher.userId,
      newValue: { resetTo: "nip", teacherId: teacher.id },
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { ok: true } });
  }
);

/**
 * DELETE /teachers/:id - hapus guru beserta akun login-nya. Untuk mengoreksi
 * salah input data. Menghapus baris `users` akan meng-cascade ke `teachers`
 * dan `evidence_requirements` (onDelete: cascade di schema).
 *
 * PENGAMANAN: relasi `teacher_student` (penugasan wali) dan `verifications`
 * (riwayat penilaian) memakai onDelete: restrict, jadi guru yang sudah pernah
 * ditugaskan atau menilai TIDAK boleh terhapus begitu saja. Di sini kita
 * cek dini dan menolak dengan pesan ramah (409) agar admin tidak kehilangan
 * data nilai/penugasan secara tak sengaja.
 */
teachersRoute.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
    if (!teacher) {
      return c.json({ error: "not_found", message: "Guru tidak ditemukan", statusCode: 404 }, 404);
    }

    const [assignment] = await db
      .select({ id: teacherStudent.id })
      .from(teacherStudent)
      .where(eq(teacherStudent.teacherId, id))
      .limit(1);
    if (assignment) {
      return c.json(
        {
          error: "conflict",
          message:
            "Guru ini masih punya penugasan sebagai Guru Wali. Cabut/hapus penugasannya dulu di menu Penugasan Guru Wali sebelum menghapus guru.",
          statusCode: 409,
        },
        409
      );
    }

    const [verification] = await db
      .select({ id: verifications.id })
      .from(verifications)
      .where(eq(verifications.teacherId, id))
      .limit(1);
    if (verification) {
      return c.json(
        {
          error: "conflict",
          message:
            "Guru ini sudah pernah menilai/memverifikasi jurnal, jadi datanya tidak bisa dihapus demi menjaga riwayat penilaian.",
          statusCode: 409,
        },
        409
      );
    }

    // Aman dihapus: hapus akun user -> cascade ke baris teachers & evidence_requirements.
    await deleteUserAccount(db, teacher.userId);

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "delete",
      tableName: "teachers",
      recordId: id,
      oldValue: teacher,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { ok: true } });
  }
);

// (toggle status guru wali)
teachersRoute.patch(
  "/:id/toggle-wali",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [existing] = await db.select().from(teachers).where(eq(teachers.id, id));
    if (!existing) {
      return c.json({ error: "not_found", message: "Guru tidak ditemukan", statusCode: 404 }, 404);
    }

    const [updated] = await db
      .update(teachers)
      .set({ isGuruWali: !existing.isGuruWali })
      .where(eq(teachers.id, id))
      .returning();

    // Sinkronkan role login dengan status wali yang baru. Perubahan role
    // baru berlaku saat guru tersebut login ulang (role tersimpan di JWT).
    const newRoleId = await getRoleId(db, updated.isGuruWali ? "guru_wali" : "guru");
    await db.update(users).set({ roleId: newRoleId }).where(eq(users.id, existing.userId));

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "update",
      tableName: "teachers",
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: updated });
  }
);
