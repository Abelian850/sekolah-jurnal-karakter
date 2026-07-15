import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { PERMISSIONS, nisnToEmail, NISN_REGEX, hashPassword, classNameToGradeLevel } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { students, users, auditLogs, journals, teacherStudent } from "../db/schema";
import { createUserAccount, deleteUserAccount } from "../services/user-provisioning";
import type { Env, Variables } from "../index";

export const studentsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * KONVENSI AKUN SISWA (pasca-Fase 6): admin TIDAK mengisi email/password.
 * - Username login = NISN (wajib, unik nasional, 5-30 digit).
 * - Email users dibuat otomatis: nisnToEmail(nisn) -> "<nisn>@siswa.internal".
 * - Kata sandi awal = NISN (dapat direset ulang via PATCH /:id/reset-password).
 */
const studentFields = {
  nis: z.string().min(1).max(30),
  nisn: z.string().regex(NISN_REGEX, "NISN harus berupa 5-30 digit angka"),
  fullName: z.string().min(3).max(255),
  className: z.string().min(1).max(20),
  // Opsional sejak revisi Juli 2026: jika kosong, diturunkan otomatis dari
  // kata pertama className (classNameToGradeLevel) - satu sumber kebenaran.
  gradeLevel: z.string().min(1).max(10).optional(),
  gender: z.enum(["L", "P"]).optional(),
  birthDate: z.string().date().optional(),
};

/** Pesan error ramah saat NISN sudah terdaftar (cek dini sebelum insert). */
async function findStudentByNisn(db: Parameters<typeof createUserAccount>[0], nisn: string) {
  const [row] = await db.select({ id: students.id }).from(students).where(eq(students.nisn, nisn));
  return row;
}

const createStudentSchema = z.object({ schoolId: z.string().uuid(), ...studentFields });

/**
 * GET /students/me - profil siswa milik akun yang sedang login.
 * Hanya authMiddleware, tanpa gerbang permission: endpoint ini semata
 * me-resolve baris students berdasarkan users.id dari JWT, dan setiap
 * handler di journals.ts tetap menurunkan kepemilikan dari database
 * sendiri, jadi tidak ada data siswa lain yang bisa bocor dari sini.
 */
studentsRoute.get("/me", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const [student] = await db.select().from(students).where(eq(students.userId, user.sub));
  if (!student) {
    return c.json(
      {
        error: "not_found",
        message: "Profil peserta didik untuk akun ini tidak ditemukan. Hubungi Admin sekolah.",
        statusCode: 404,
      },
      404
    );
  }

  return c.json({ data: student });
});

studentsRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  async (c) => {
    const db = c.get("db");
    const schoolId = c.req.query("schoolId");
    const className = c.req.query("className");
    // Default: HANYA siswa aktif (alumni/nonaktif disembunyikan dari
    // daftar, penugasan wali, dan ekspor). ?includeInactive=true untuk
    // menampilkan semuanya (opsi "tampilkan alumni" di daftar siswa).
    const includeInactive = c.req.query("includeInactive") === "true";

    let result = schoolId
      ? await db.select().from(students).where(eq(students.schoolId, schoolId))
      : await db.select().from(students);

    if (!includeInactive) {
      result = result.filter((s) => s.isActive);
    }
    if (className) {
      result = result.filter((s) => s.className === className);
    }

    return c.json({ data: result });
  }
);

studentsRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  zValidator("json", createStudentSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const body = c.req.valid("json");

    if (await findStudentByNisn(db, body.nisn)) {
      return c.json(
        { error: "conflict", message: `NISN ${body.nisn} sudah terdaftar`, statusCode: 409 },
        409
      );
    }

    const user = await createUserAccount(db, {
      email: nisnToEmail(body.nisn),
      plainPassword: body.nisn,
      roleName: "peserta_didik",
    });

    try {
      const [student] = await db
        .insert(students)
        .values({
          userId: user.id,
          schoolId: body.schoolId,
          nis: body.nis,
          nisn: body.nisn,
          fullName: body.fullName,
          className: body.className,
          gradeLevel: body.gradeLevel?.trim() || classNameToGradeLevel(body.className),
          gender: body.gender,
          birthDate: body.birthDate,
        })
        .returning();

      await db.insert(auditLogs).values({
        userId: admin.sub,
        action: "create",
        tableName: "students",
        recordId: student.id,
        newValue: student,
        ipAddress: c.req.header("cf-connecting-ip") ?? null,
      });

      return c.json({ data: student }, 201);
    } catch (err) {
      await deleteUserAccount(db, user.id);
      throw err;
    }
  }
);

const bulkStudentSchema = z.object({
  schoolId: z.string().uuid(),
  rows: z.array(z.object(studentFields)).min(1).max(1000),
});

/**
 * POST /students/bulk - lihat catatan desain yang sama dengan
 * teachers.ts POST /teachers/bulk: baris diproses independen, ringkasan
 * sukses/gagal per baris dikembalikan, parsing Excel dilakukan di
 * frontend (docs/bulk-import-export.md).
 */
studentsRoute.post(
  "/bulk",
  authMiddleware,
  requirePermission(PERMISSIONS.BULK_IMPORT_EXPORT),
  zValidator("json", bulkStudentSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const { schoolId, rows } = c.req.valid("json");

    const results: Array<{ row: number; success: boolean; message?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (await findStudentByNisn(db, row.nisn)) {
          results.push({ row: i + 1, success: false, message: `NISN ${row.nisn} sudah terdaftar` });
          continue;
        }

        const user = await createUserAccount(db, {
          email: nisnToEmail(row.nisn),
          plainPassword: row.nisn,
          roleName: "peserta_didik",
        });

        const [student] = await db
          .insert(students)
          .values({
            userId: user.id,
            schoolId,
            nis: row.nis,
            nisn: row.nisn,
            fullName: row.fullName,
            className: row.className,
            gradeLevel: row.gradeLevel?.trim() || classNameToGradeLevel(row.className),
            gender: row.gender,
            birthDate: row.birthDate,
          })
          .returning();

        await db.insert(auditLogs).values({
          userId: admin.sub,
          action: "create",
          tableName: "students",
          recordId: student.id,
          newValue: student,
          ipAddress: c.req.header("cf-connecting-ip") ?? null,
        });

        results.push({ row: i + 1, success: true });
      } catch (err) {
        results.push({ row: i + 1, success: false, message: (err as Error).message });
      }
    }

    return c.json({ data: results });
  }
);

/**
 * PATCH /students/:id/reset-password - reset kata sandi siswa kembali ke
 * NISN-nya. Untuk siswa lama yang dibuat sebelum konvensi login-NISN, atau
 * siswa yang lupa kata sandi. Hanya Admin (STUDENT_MANAGE).
 */
studentsRoute.patch(
  "/:id/reset-password",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) {
      return c.json(
        { error: "not_found", message: "Peserta didik tidak ditemukan", statusCode: 404 },
        404
      );
    }
    if (!student.nisn) {
      return c.json(
        {
          error: "bad_request",
          message:
            "Siswa ini belum memiliki NISN, jadi kata sandi tidak bisa direset ke NISN. Lengkapi NISN-nya dulu.",
          statusCode: 400,
        },
        400
      );
    }

    const passwordHash = await hashPassword(student.nisn);
    await db.update(users).set({ passwordHash }).where(eq(users.id, student.userId));

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "reset_password",
      tableName: "users",
      recordId: student.userId,
      newValue: { resetTo: "nisn", studentId: student.id },
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { ok: true } });
  }
);

// (hapus peserta didik)
/**
 * DELETE /students/:id - hapus peserta didik beserta akun login-nya. Untuk
 * mengoreksi salah input data. Menghapus baris `users` akan meng-cascade ke
 * `students`, dan seterusnya ke penugasan wali, relasi orang tua, notifikasi,
 * dsb (semua onDelete: cascade di schema).
 *
 * PENGAMANAN: jika siswa sudah punya jurnal, penghapusan ditolak (409) agar
 * data karakter/nilai tidak ikut terhapus tanpa disadari. Siswa yang baru
 * salah-input (belum mengisi jurnal) tetap bisa dihapus.
 */
studentsRoute.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) {
      return c.json(
        { error: "not_found", message: "Peserta didik tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const [journal] = await db
      .select({ id: journals.id })
      .from(journals)
      .where(eq(journals.studentId, id))
      .limit(1);
    if (journal) {
      return c.json(
        {
          error: "conflict",
          message:
            "Peserta didik ini sudah punya jurnal, jadi datanya tidak bisa dihapus demi menjaga riwayat pengisian dan nilai.",
          statusCode: 409,
        },
        409
      );
    }

    // Aman dihapus: hapus akun user -> cascade ke students & relasi turunannya.
    await deleteUserAccount(db, student.userId);

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "delete",
      tableName: "students",
      recordId: id,
      oldValue: student,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { ok: true } });
  }
);

const bulkDeleteSchema = z.object({
  nisns: z
    .array(z.string().regex(NISN_REGEX, "NISN harus berupa 5-30 digit angka"))
    .min(1)
    .max(1000),
});

/**
 * POST /students/bulk-delete - hapus banyak peserta didik sekaligus
 * berdasarkan daftar NISN (dari file Excel yang di-parse di browser,
 * pola sama dengan POST /students/bulk — lihat docs/bulk-import-export.md).
 *
 * Sengaja HANYA menerima NISN, bukan nama: nama tidak unik dan rawan
 * salah ketik, sedangkan NISN adalah kunci unik nasional.
 *
 * Aturan per baris (independen, ringkasan sukses/gagal dikembalikan):
 * - NISN tidak ditemukan -> gagal (tidak menghentikan baris lain).
 * - Siswa sudah punya jurnal -> gagal (proteksi yang sama dengan
 *   DELETE /:id, menjaga riwayat pengisian dan nilai).
 * - Selain itu: hapus akun users -> cascade ke students & relasi
 *   turunannya, plus satu baris audit_logs per siswa terhapus.
 */
studentsRoute.post(
  "/bulk-delete",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  zValidator("json", bulkDeleteSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const { nisns } = c.req.valid("json");

    const results: Array<{ row: number; nisn: string; success: boolean; message?: string }> = [];

    for (let i = 0; i < nisns.length; i++) {
      const nisn = nisns[i];
      try {
        const [student] = await db.select().from(students).where(eq(students.nisn, nisn));
        if (!student) {
          results.push({
            row: i + 1,
            nisn,
            success: false,
            message: `NISN ${nisn} tidak ditemukan`,
          });
          continue;
        }

        const [journal] = await db
          .select({ id: journals.id })
          .from(journals)
          .where(eq(journals.studentId, student.id))
          .limit(1);
        if (journal) {
          results.push({
            row: i + 1,
            nisn,
            success: false,
            message: `${student.fullName} sudah punya jurnal, dilewati demi menjaga riwayat nilai`,
          });
          continue;
        }

        await deleteUserAccount(db, student.userId);

        await db.insert(auditLogs).values({
          userId: admin.sub,
          action: "delete",
          tableName: "students",
          recordId: student.id,
          oldValue: student,
          ipAddress: c.req.header("cf-connecting-ip") ?? null,
        });

        results.push({ row: i + 1, nisn, success: true, message: student.fullName });
      } catch (err) {
        results.push({ row: i + 1, nisn, success: false, message: (err as Error).message });
      }
    }

    return c.json({ data: results });
  }
);

// ---------- KELULUSAN & KENAIKAN KELAS (lihat docs/catatan-sesi-2026-07-11.md) ----------
/**
 * PRINSIP: data alumni TIDAK PERNAH dihapus — jurnal/verifikasi/nilai
 * mereferensikan students (FK), dan sekolah butuh arsip. Kelulusan hanya
 * menonaktifkan: students.isActive=false + status="lulus" + graduatedAt,
 * users.isActive=false (login otomatis tertolak — Auth.js mengecek
 * users.isActive), dan penugasan wali dilepas (teacher_student.isActive=
 * false + unassignedAt) supaya dashboard Guru Wali bersih.
 *
 * Urutan operasional tiap tahun ajaran baru: KELULUSAN dulu, baru
 * KENAIKAN KELAS (supaya angkatan tertinggi tidak ikut "naik").
 */

const graduateBulkSchema = z.object({
  schoolId: z.string().uuid(),
  gradeLevel: z.string().min(1).max(10), // mis. "IX" — satu angkatan penuh
  // Siswa tinggal kelas / ditunda kelulusannya: dikecualikan per siswa.
  excludeStudentIds: z.array(z.string().uuid()).max(1000).optional(),
});

/**
 * POST /students/graduate-bulk - tandai SATU ANGKATAN sebagai lulus.
 * Pola laporan per baris sama dengan /students/bulk: tiap siswa diproses
 * independen + satu baris audit_logs per siswa. Siswa yang sudah nonaktif
 * tidak pernah terpilih (filter isActive=true di query).
 */
studentsRoute.post(
  "/graduate-bulk",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  zValidator("json", graduateBulkSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const { schoolId, gradeLevel, excludeStudentIds } = c.req.valid("json");
    const excluded = new Set(excludeStudentIds ?? []);

    const candidates = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.schoolId, schoolId),
          eq(students.gradeLevel, gradeLevel),
          eq(students.isActive, true)
        )
      );

    const results: Array<{
      row: number;
      nisn: string | null;
      fullName: string;
      success: boolean;
      message?: string;
    }> = [];
    let excludedCount = 0;
    const graduatedAt = new Date();

    let row = 0;
    for (const s of candidates) {
      if (excluded.has(s.id)) {
        excludedCount++;
        continue;
      }
      row++;
      try {
        await db
          .update(students)
          .set({ isActive: false, status: "lulus", graduatedAt })
          .where(eq(students.id, s.id));
        await db.update(users).set({ isActive: false }).where(eq(users.id, s.userId));
        await db
          .update(teacherStudent)
          .set({ isActive: false, unassignedAt: graduatedAt })
          .where(and(eq(teacherStudent.studentId, s.id), eq(teacherStudent.isActive, true)));

        await db.insert(auditLogs).values({
          userId: admin.sub,
          action: "graduate",
          tableName: "students",
          recordId: s.id,
          oldValue: { isActive: true, status: s.status },
          newValue: { isActive: false, status: "lulus", graduatedAt },
          ipAddress: c.req.header("cf-connecting-ip") ?? null,
        });

        results.push({ row, nisn: s.nisn, fullName: s.fullName, success: true });
      } catch (err) {
        results.push({
          row,
          nisn: s.nisn,
          fullName: s.fullName,
          success: false,
          message: (err as Error).message,
        });
      }
    }

    return c.json({ data: { results, excludedCount } });
  }
);

const promoteBulkSchema = z
  .object({
    schoolId: z.string().uuid(),
    // Pemetaan kelas EKSPLISIT dan bisa diedit admin (mis. "VII A" ->
    // "VIII A") — sengaja tidak menebak/mengganti angka romawi otomatis.
    mappings: z
      .array(
        z.object({
          fromClassName: z.string().min(2).max(20),
          toClassName: z.string().min(2).max(20),
          toGradeLevel: z.string().min(1).max(10),
        })
      )
      .min(1)
      .max(100),
    // Siswa tinggal kelas: dikecualikan per siswa dari kenaikan massal.
    excludeStudentIds: z.array(z.string().uuid()).max(1000).optional(),
  })
  .superRefine((val, ctx) => {
    const seen = new Set<string>();
    for (const m of val.mappings) {
      if (seen.has(m.fromClassName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Kelas asal "${m.fromClassName}" muncul lebih dari sekali dalam pemetaan`,
          path: ["mappings"],
        });
      }
      seen.add(m.fromClassName);
      if (m.fromClassName === m.toClassName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Pemetaan "${m.fromClassName}" tidak mengubah kelas — hapus baris ini atau perbaiki kelas tujuan`,
          path: ["mappings"],
        });
      }
    }
  });

/**
 * POST /students/promote-bulk - kenaikan kelas massal per pemetaan kelas.
 * Jalankan SETELAH graduate-bulk (angkatan tertinggi sudah nonaktif dan
 * tidak akan terpilih karena filter isActive=true). Laporan per baris +
 * audit_logs per siswa, pola sama dengan aksi massal lain.
 */
studentsRoute.post(
  "/promote-bulk",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  zValidator("json", promoteBulkSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const { schoolId, mappings, excludeStudentIds } = c.req.valid("json");
    const excluded = new Set(excludeStudentIds ?? []);

    const results: Array<{
      row: number;
      nisn: string | null;
      fullName: string;
      from: string;
      to: string;
      success: boolean;
      message?: string;
    }> = [];
    let excludedCount = 0;
    let row = 0;

    for (const m of mappings) {
      const candidates = await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.schoolId, schoolId),
            eq(students.className, m.fromClassName),
            eq(students.isActive, true)
          )
        );

      for (const s of candidates) {
        if (excluded.has(s.id)) {
          excludedCount++;
          continue;
        }
        row++;
        try {
          await db
            .update(students)
            .set({ className: m.toClassName, gradeLevel: m.toGradeLevel })
            .where(eq(students.id, s.id));

          await db.insert(auditLogs).values({
            userId: admin.sub,
            action: "promote",
            tableName: "students",
            recordId: s.id,
            oldValue: { className: s.className, gradeLevel: s.gradeLevel },
            newValue: { className: m.toClassName, gradeLevel: m.toGradeLevel },
            ipAddress: c.req.header("cf-connecting-ip") ?? null,
          });

          results.push({
            row,
            nisn: s.nisn,
            fullName: s.fullName,
            from: m.fromClassName,
            to: m.toClassName,
            success: true,
          });
        } catch (err) {
          results.push({
            row,
            nisn: s.nisn,
            fullName: s.fullName,
            from: m.fromClassName,
            to: m.toClassName,
            success: false,
            message: (err as Error).message,
          });
        }
      }
    }

    return c.json({ data: { results, excludedCount } });
  }
);
