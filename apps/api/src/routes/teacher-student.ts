import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { PERMISSIONS, NISN_REGEX } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { teacherStudent, teachers, students, auditLogs } from "../db/schema";
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

    // Alumni/siswa nonaktif tidak bisa ditugaskan ke Guru Wali (fitur
    // Kelulusan): riwayat binaan lama tetap tersimpan, tapi penugasan
    // baru hanya untuk siswa aktif.
    const [targetStudent] = await db
      .select({ id: students.id, isActive: students.isActive, fullName: students.fullName })
      .from(students)
      .where(eq(students.id, body.studentId));
    if (!targetStudent) {
      return c.json(
        { error: "not_found", message: "Peserta didik tidak ditemukan", statusCode: 404 },
        404
      );
    }
    if (!targetStudent.isActive) {
      return c.json(
        {
          error: "bad_request",
          message: `${targetStudent.fullName} sudah lulus/nonaktif — tidak bisa ditugaskan ke Guru Wali`,
          statusCode: 400,
        },
        400
      );
    }

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

const bulkAssignSchema = z
  .object({
    teacherId: z.string().uuid(),
    academicYearId: z.string().uuid(),
    /** Mode multi-select: id siswa dari daftar yang sudah dimuat. */
    studentIds: z.array(z.string().uuid()).max(500).optional(),
    /** Mode upload/tempel: daftar NISN, dicocokkan ke database siswa. */
    nisns: z.array(z.string().regex(NISN_REGEX, "NISN harus 5-30 digit angka")).max(500).optional(),
  })
  .refine((v) => (v.studentIds?.length ?? 0) + (v.nisns?.length ?? 0) > 0, {
    message: "Isi studentIds atau nisns (minimal satu siswa)",
  });

/**
 * POST /teacher-student/bulk -> menugaskan satu Guru Wali ke BANYAK siswa
 * sekaligus (revisi Juli 2026). Dua mode input yang bisa digabung:
 * multi-select (studentIds) dan upload/tempel daftar NISN (nisns) yang
 * dicocokkan ke database peserta didik.
 *
 * Berbeda dengan POST / (tunggal) yang MEMINDAHKAN penugasan lama, bulk
 * SENGAJA tidak pernah memindahkan: siswa yang sudah punya Guru Wali aktif
 * pada tahun ajaran tsb dilaporkan sebagai gagal per baris (bukan gagal
 * total, pola /teachers/bulk) supaya penugasan massal tidak diam-diam
 * merebut binaan guru lain. Pemindahan tetap lewat form tunggal.
 */
teacherStudentRoute.post(
  "/bulk",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_STUDENT_ASSIGN),
  zValidator("json", bulkAssignSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const { teacherId, academicYearId, studentIds = [], nisns = [] } = c.req.valid("json");

    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId));
    if (!teacher) {
      return c.json({ error: "not_found", message: "Guru tidak ditemukan", statusCode: 404 }, 404);
    }
    if (!teacher.isGuruWali) {
      return c.json(
        { error: "bad_request", message: "Guru ini bukan Guru Wali", statusCode: 400 },
        400
      );
    }

    // Resolusi sekali jalan (hindari N query): siswa by id dan by NISN.
    const byId =
      studentIds.length > 0
        ? await db
            .select({
              id: students.id,
              nisn: students.nisn,
              fullName: students.fullName,
              isActive: students.isActive,
            })
            .from(students)
            .where(inArray(students.id, studentIds))
        : [];
    const byNisn =
      nisns.length > 0
        ? await db
            .select({
              id: students.id,
              nisn: students.nisn,
              fullName: students.fullName,
              isActive: students.isActive,
            })
            .from(students)
            .where(inArray(students.nisn, nisns))
        : [];
    const idMap = new Map(byId.map((s) => [s.id, s]));
    const nisnMap = new Map(byNisn.map((s) => [s.nisn as string, s]));

    // Daftar target terurut sesuai input; identifier dipakai di laporan.
    const targets: Array<{
      identifier: string;
      student?: { id: string; fullName: string; isActive: boolean };
    }> = [
      ...studentIds.map((id) => ({ identifier: id, student: idMap.get(id) })),
      ...nisns.map((nisn) => ({ identifier: `NISN ${nisn}`, student: nisnMap.get(nisn) })),
    ];

    const results: Array<{ row: number; identifier: string; success: boolean; message?: string }> =
      [];
    const seen = new Set<string>();

    for (let i = 0; i < targets.length; i++) {
      const { identifier, student } = targets[i];
      const label = student ? `${student.fullName} (${identifier})` : identifier;
      try {
        if (!student) {
          results.push({
            row: i + 1,
            identifier,
            success: false,
            message: `${identifier} tidak ditemukan di database peserta didik`,
          });
          continue;
        }
        if (!student.isActive) {
          results.push({
            row: i + 1,
            identifier: label,
            success: false,
            message: "Sudah lulus/nonaktif - tidak bisa ditugaskan",
          });
          continue;
        }
        if (seen.has(student.id)) {
          results.push({
            row: i + 1,
            identifier: label,
            success: false,
            message: "Duplikat di daftar yang sama - dilewati",
          });
          continue;
        }
        seen.add(student.id);

        const [currentAssignment] = await db
          .select()
          .from(teacherStudent)
          .where(
            and(
              eq(teacherStudent.studentId, student.id),
              eq(teacherStudent.academicYearId, academicYearId),
              eq(teacherStudent.isActive, true)
            )
          );
        if (currentAssignment) {
          results.push({
            row: i + 1,
            identifier: label,
            success: false,
            message:
              currentAssignment.teacherId === teacherId
                ? "Sudah dibina Guru Wali ini"
                : "Sudah punya Guru Wali aktif - pindahkan lewat form penugasan tunggal",
          });
          continue;
        }

        const [newAssignment] = await db
          .insert(teacherStudent)
          .values({ teacherId, studentId: student.id, academicYearId })
          .returning();

        await db.insert(auditLogs).values({
          userId: admin.sub,
          action: "create",
          tableName: "teacher_student",
          recordId: newAssignment.id,
          newValue: newAssignment,
          ipAddress: c.req.header("cf-connecting-ip") ?? null,
        });

        results.push({ row: i + 1, identifier: label, success: true });
      } catch (err) {
        results.push({
          row: i + 1,
          identifier: label,
          success: false,
          message: (err as Error).message,
        });
      }
    }

    return c.json({ data: results });
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
