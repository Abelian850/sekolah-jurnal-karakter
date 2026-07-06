import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { students, auditLogs } from "../db/schema";
import { createUserAccount, deleteUserAccount } from "../services/user-provisioning";
import type { Env, Variables } from "../index";

export const studentsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const studentFields = {
  email: z.string().email(),
  password: z.string().min(8),
  nis: z.string().min(1).max(30),
  nisn: z.string().max(30).optional(),
  fullName: z.string().min(3).max(255),
  className: z.string().min(2).max(20),
  gradeLevel: z.string().min(2).max(10),
  gender: z.enum(["L", "P"]).optional(),
  birthDate: z.string().date().optional(),
};

const createStudentSchema = z.object({ schoolId: z.string().uuid(), ...studentFields });

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

    const user = await createUserAccount(db, {
      email: body.email,
      plainPassword: body.password,
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
        const user = await createUserAccount(db, {
          email: row.email,
          plainPassword: row.password,
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
