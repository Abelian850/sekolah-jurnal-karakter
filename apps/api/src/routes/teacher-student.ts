import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { teacherStudent, auditLogs } from "../db/schema";
import type { Env, Variables } from "../index";

export const teacherStudentRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const assignSchema = z.object({
  teacherId: z.string().uuid(),
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
});

/**
 * GET /teacher-student?studentId=... -> riwayat Guru Wali seorang siswa
 * GET /teacher-student?teacherId=...  -> daftar siswa binaan seorang Guru Wali
 * Salah satu wajib diisi, tidak ada endpoint "list semua" karena datanya
 * historis dan bisa sangat besar tanpa filter.
 */
teacherStudentRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_STUDENT_ASSIGN),
  async (c) => {
    const db = c.get("db");
    const studentId = c.req.query("studentId");
    const teacherId = c.req.query("teacherId");

    if (!studentId && !teacherId) {
      return c.json(
        {
          error: "bad_request",
          message: "Isi salah satu query param: studentId atau teacherId",
          statusCode: 400,
        },
        400
      );
    }

    const result = studentId
      ? await db.select().from(teacherStudent).where(eq(teacherStudent.studentId, studentId))
      : await db.select().from(teacherStudent).where(eq(teacherStudent.teacherId, teacherId as string));

    return c.json({ data: result });
  }
);

/**
 * POST /teacher-student -> menugaskan (atau MEMINDAHKAN) Guru Wali seorang siswa.
 *
 * Ini adalah implementasi konkret dari keputusan desain Fase 1: mengubah
 * Guru Wali TIDAK PERNAH menyentuh tabel `students`. Yang terjadi:
 *   1. Cari baris teacher_student aktif milik siswa ini pada tahun ajaran
 *      yang sama (jika ada) -> tandai unassignedAt + isActive=false.
 *   2. Insert baris baru dengan Guru Wali yang baru.
 * Kedua operasi dijalankan berurutan (bukan satu transaksi interaktif,
 * lihat batasan Neon HTTP driver di user-provisioning.ts), tapi urutannya
 * aman: jika langkah 2 gagal, siswa hanya jadi tanpa Guru Wali sementara
 * (bukan data yang saling bertentangan/dua Guru Wali aktif sekaligus).
 */
teacherStudentRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_STUDENT_ASSIGN),
  zValidator("json", assignSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const body = c.req.valid("json");

    const [currentAssignment] = await db
      .select()
      .from(teacherStudent)
      .where(
        and(
          eq(teacherStudent.studentId, body.studentId),
          eq(teacherStudent.academicYearId, body.academicYearId),
          eq(teacherStudent.isActive, true)
        )
      );

    if (currentAssignment) {
      if (currentAssignment.teacherId === body.teacherId) {
        return c.json(
          {
            error: "conflict",
            message: "Siswa ini sudah dibina oleh Guru Wali yang sama pada tahun ajaran ini",
            statusCode: 409,
          },
          409
        );
      }

      await db
        .update(teacherStudent)
        .set({ isActive: false, unassignedAt: new Date() })
        .where(eq(teacherStudent.id, currentAssignment.id));
    }

    const [newAssignment] = await db.insert(teacherStudent).values(body).returning();

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: currentAssignment ? "reassign" : "create",
      tableName: "teacher_student",
      recordId: newAssignment.id,
      oldValue: currentAssignment ?? null,
      newValue: newAssignment,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: newAssignment }, 201);
  }
);

/**
 * DELETE /teacher-student/:id -> melepas Guru Wali dari siswa tanpa
 * menugaskan penggantinya (mis. siswa pindah sekolah). Bersifat soft-delete
 * (isActive=false + unassignedAt) agar riwayat tetap tersimpan.
 */
teacherStudentRoute.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_STUDENT_ASSIGN),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [existing] = await db.select().from(teacherStudent).where(eq(teacherStudent.id, id));
    if (!existing) {
      return c.json({ error: "not_found", message: "Penugasan tidak ditemukan", statusCode: 404 }, 404);
    }

    const [updated] = await db
      .update(teacherStudent)
      .set({ isActive: false, unassignedAt: new Date() })
      .where(eq(teacherStudent.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "unassign",
      tableName: "teacher_student",
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: updated });
  }
);
