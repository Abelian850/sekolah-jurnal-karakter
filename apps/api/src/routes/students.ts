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
  // Opsional sejak revisi Juli 2026: NIS internal sekolah boleh kosong,
  // identitas utama adalah NISN. "" dinormalisasi ke undefined agar unique
  // index (schoolId, nis) di Postgres tidak bentrok antar string kosong.
  nis: z
    .string()
    .max(30)
    .optional()
    .transform((v) => v?.trim() || undefined),
  nisn: z.string().regex(NISN_REGEX, "NISN harus berupa 5-30 digit angka"),
  fullName: z.string().min(3).max(255),
  className: z.string().min(1).max(20),
  // Opsional sejak revisi Juli 2026: jika kosong, diturunkan otomatis dari
  // kata pertama className (classNameToGradeLevel) - satu sumber kebenaran.
  gradeLevel: z.string().min(1).max(10).optional(),
  gender: z.enum(["L", "P"]).optional(),
  birthDate: z.string().date().optional(),
};

/** Penjaga murah agar :id yang bukan UUID dijawab 404, bukan 500 dari Postgres. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Skema PATCH /students/:id - koreksi data murid yang salah input.
 *
 * `nisn` SENGAJA TIDAK ADA DI SINI, dan .strict() membuat pengirimannya
 * ditolak 400 alih-alih diam-diam diabaikan. Alasannya: NISN bukan sekadar
 * atribut, melainkan identitas login. users.email diturunkan darinya
 * (nisnToEmail) dan kata sandi awal juga NISN, jadi mengubahnya harus ikut
 * menyentuh dua kolom di tabel users. Itu alur tersendiri yang perlu
 * disadari akibatnya - bukan satu isian di formulir edit biasa.
 *
 * Semua field opsional: yang tidak dikirim tidak diubah. String kosong pada
 * nis/gender/birthDate berarti "kosongkan" (disimpan NULL), berbeda dengan
 * field yang tidak dikirim sama sekali.
 */
const updateStudentSchema = z
  .object({
    nis: z.string().max(30).optional(),
    fullName: z.string().min(3).max(255).optional(),
    className: z.string().min(1).max(20).optional(),
    gradeLevel: z.string().min(1).max(10).optional(),
    gender: z.union([z.enum(["L", "P"]), z.literal("")]).optional(),
    birthDate: z.union([z.string().date(), z.literal("")]).optional(),
  })
  .strict();

/** Pesan error ramah saat NISN sudah terdaftar (cek dini sebelum insert). */
async function findStudentByNisn(db: Parameters<typeof createUserAccount>[0], nisn: string) {
  const [row] = await db.select({ id: students.id }).from(students).where(eq(students.nisn, nisn));
  return row;
}

const createStudentSchema = z.object({ schoolId: z.string().uuid(), ...studentFields });

/**
 * GET /students/me - profil murid milik akun yang sedang login.
 * Hanya authMiddleware, tanpa gerbang permission: endpoint ini semata
 * me-resolve baris students berdasarkan users.id dari JWT, dan setiap
 * handler di journals.ts tetap menurunkan kepemilikan dari database
 * sendiri, jadi tidak ada data murid lain yang bisa bocor dari sini.
 */
studentsRoute.get("/me", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const [student] = await db.select().from(students).where(eq(students.userId, user.sub));
  if (!student) {
    return c.json(
      {
        error: "not_found",
        message: "Profil murid untuk akun ini tidak ditemukan. Hubungi Admin sekolah.",
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
    // Default: HANYA murid aktif (alumni/nonaktif disembunyikan dari
    // daftar, penugasan wali, dan ekspor). ?includeInactive=true untuk
    // menampilkan semuanya (opsi "tampilkan alumni" di daftar murid).
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

/**
 * GET /students/:id - satu murid. Dipakai halaman Edit Murid di Admin untuk
 * mengisi nilai awal formulir. Sengaja terdaftar SETELAH GET /me supaya
 * "/me" tidak ikut tertangkap sebagai :id.
 */
studentsRoute.get(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");

    // Postgres melempar error sintaks kalau :id bukan UUID (mis. dari URL
    // yang diketik manual). Tangkap lebih dulu supaya jawabannya 404 yang
    // wajar, bukan 500.
    if (!UUID_REGEX.test(id)) {
      return c.json(
        { error: "not_found", message: "Murid tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) {
      return c.json(
        { error: "not_found", message: "Murid tidak ditemukan", statusCode: 404 },
        404
      );
    }

    return c.json({ data: student });
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

        // Impor sebelumnya bisa meninggalkan "user yatim": baris users sudah
        // dibuat tapi insert students-nya gagal (mis. kena limit subrequest
        // Workers). Email unik, jadi createUserAccount akan bentrok selamanya.
        // Deteksi & hapus user yatim dulu agar impor ulang bisa jalan.
        const email = nisnToEmail(row.nisn);
        const [existingUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email));
        if (existingUser) {
          const [profile] = await db
            .select({ id: students.id })
            .from(students)
            .where(eq(students.userId, existingUser.id));
          if (profile) {
            results.push({ row: i + 1, success: false, message: `NISN ${row.nisn} sudah terdaftar` });
            continue;
          }
          await deleteUserAccount(db, existingUser.id);
        }

        const user = await createUserAccount(db, {
          email,
          plainPassword: row.nisn,
          roleName: "peserta_didik",
        });

        try {
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
          // Kompensasi manual (tidak ada transaksi di driver HTTP Neon):
          // jangan tinggalkan user yatim untuk percobaan berikutnya.
          await deleteUserAccount(db, user.id).catch(() => {});
          throw err;
        }
      } catch (err) {
        results.push({ row: i + 1, success: false, message: (err as Error).message });
      }
    }

    return c.json({ data: results });
  }
);

/**
 * PATCH /students/:id/reset-password - reset kata sandi murid kembali ke
 * NISN-nya. Untuk murid lama yang dibuat sebelum konvensi login-NISN, atau
 * murid yang lupa kata sandi. Hanya Admin (STUDENT_MANAGE).
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
        { error: "not_found", message: "Murid tidak ditemukan", statusCode: 404 },
        404
      );
    }
    if (!student.nisn) {
      return c.json(
        {
          error: "bad_request",
          message:
            "Murid ini belum memiliki NISN, jadi kata sandi tidak bisa direset ke NISN. Lengkapi NISN-nya dulu.",
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

/**
 * PATCH /students/:id - ubah data murid (koreksi salah input).
 *
 * Ada karena sebelum ini SATU-SATUNYA cara membetulkan nama murid yang salah
 * ketik adalah membuka SQL Editor produksi - jauh lebih berbahaya daripada
 * kesalahan yang sedang diperbaiki (kejadian nyata 14 Agustus 2026: nama HAXI
 * dan KHAILA tertukar dan harus ditukar lewat SQL langsung).
 *
 * Yang TIDAK bisa diubah lewat sini: nisn (identitas login - lihat catatan di
 * updateStudentSchema), isActive/status (punya alur Kelulusan & Kenaikan
 * Kelas sendiri), dan schoolId (pindah sekolah bukan operasi edit).
 *
 * Catatan penting soal gradeLevel: kalau className diubah tanpa gradeLevel
 * ikut dikirim, gradeLevel DITURUNKAN ULANG dari kata pertama className -
 * sama seperti saat pembuatan. Tanpa itu, memindahkan murid dari "VII A" ke
 * "VIII A" akan meninggalkan gradeLevel di "VII", dan fitur Kelulusan &
 * Kenaikan Kelas (yang menyaring berdasarkan gradeLevel) diam-diam salah
 * memilih murid.
 */
studentsRoute.patch(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.STUDENT_MANAGE),
  zValidator("json", updateStudentSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    if (!UUID_REGEX.test(id)) {
      return c.json(
        { error: "not_found", message: "Murid tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) {
      return c.json(
        { error: "not_found", message: "Murid tidak ditemukan", statusCode: 404 },
        404
      );
    }

    // Dibangun dari field yang BENAR-BENAR dikirim. `undefined` = tidak
    // disentuh; string kosong = dikosongkan menjadi NULL.
    const patch: Partial<typeof students.$inferInsert> = {};

    if (body.nis !== undefined) patch.nis = body.nis.trim() || null;
    if (body.fullName !== undefined) patch.fullName = body.fullName.trim();
    if (body.gender !== undefined) patch.gender = body.gender || null;
    if (body.birthDate !== undefined) patch.birthDate = body.birthDate || null;

    if (body.className !== undefined) {
      patch.className = body.className.trim();
      patch.gradeLevel = body.gradeLevel?.trim() || classNameToGradeLevel(body.className);
    } else if (body.gradeLevel !== undefined) {
      patch.gradeLevel = body.gradeLevel.trim();
    }

    if (Object.keys(patch).length === 0) {
      return c.json(
        {
          error: "bad_request",
          message: "Tidak ada data yang diubah.",
          statusCode: 400,
        },
        400
      );
    }

    // NIS unik per sekolah (uniqueIndex students_nis_idx). Dicek lebih dulu
    // supaya pesannya ramah, bukan error constraint mentah dari Postgres.
    if (patch.nis) {
      const [bentrok] = await db
        .select({ id: students.id, fullName: students.fullName })
        .from(students)
        .where(and(eq(students.schoolId, student.schoolId), eq(students.nis, patch.nis)));
      if (bentrok && bentrok.id !== id) {
        return c.json(
          {
            error: "conflict",
            message: `NIS ${patch.nis} sudah dipakai oleh ${bentrok.fullName}`,
            statusCode: 409,
          },
          409
        );
      }
    }

    const [updated] = await db
      .update(students)
      .set(patch)
      .where(eq(students.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "update",
      tableName: "students",
      recordId: id,
      oldValue: student,
      newValue: updated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: updated });
  }
);

// (hapus murid)
/**
 * DELETE /students/:id - hapus murid beserta akun login-nya. Untuk
 * mengoreksi salah input data. Menghapus baris `users` akan meng-cascade ke
 * `students`, dan seterusnya ke penugasan wali, relasi orang tua, notifikasi,
 * dsb (semua onDelete: cascade di schema).
 *
 * PENGAMANAN: jika murid sudah punya jurnal, penghapusan ditolak (409) agar
 * data karakter/nilai tidak ikut terhapus tanpa disadari. Murid yang baru
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
        { error: "not_found", message: "Murid tidak ditemukan", statusCode: 404 },
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
            "Murid ini sudah punya jurnal, jadi datanya tidak bisa dihapus demi menjaga riwayat pengisian dan nilai.",
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
 * POST /students/bulk-delete - hapus banyak murid sekaligus
 * berdasarkan daftar NISN (dari file Excel yang di-parse di browser,
 * pola sama dengan POST /students/bulk — lihat docs/bulk-import-export.md).
 *
 * Sengaja HANYA menerima NISN, bukan nama: nama tidak unik dan rawan
 * salah ketik, sedangkan NISN adalah kunci unik nasional.
 *
 * Aturan per baris (independen, ringkasan sukses/gagal dikembalikan):
 * - NISN tidak ditemukan -> gagal (tidak menghentikan baris lain).
 * - Murid sudah punya jurnal -> gagal (proteksi yang sama dengan
 *   DELETE /:id, menjaga riwayat pengisian dan nilai).
 * - Selain itu: hapus akun users -> cascade ke students & relasi
 *   turunannya, plus satu baris audit_logs per murid terhapus.
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
  // Murid tinggal kelas / ditunda kelulusannya: dikecualikan per murid.
  excludeStudentIds: z.array(z.string().uuid()).max(1000).optional(),
});

/**
 * POST /students/graduate-bulk - tandai SATU ANGKATAN sebagai lulus.
 * Pola laporan per baris sama dengan /students/bulk: tiap murid diproses
 * independen + satu baris audit_logs per murid. Murid yang sudah nonaktif
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
    // Murid tinggal kelas: dikecualikan per murid dari kenaikan massal.
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
 * audit_logs per murid, pola sama dengan aksi massal lain.
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
