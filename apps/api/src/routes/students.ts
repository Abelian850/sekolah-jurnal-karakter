import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { PERMISSIONS, nisnToEmail, NISN_REGEX, hashPassword } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { students, users, auditLogs } from "../db/schema";
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
  className: z.string().min(2).max(20),
  gradeLevel: z.string().min(2).max(10),
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

    let result = schoolId
      ? await db.select().from(students).where(eq(students.schoolId, schoolId))
      : await db.select().from(students);

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
          gradeLevel: body.gradeLevel,
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
            gradeLevel: row.gradeLevel,
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
