import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc, desc } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  students,
  journals,
  journalItems,
  journalTemplates,
  journalTemplateItems,
  academicYears,
  semesters,
} from "../db/schema";
import type { Database } from "../db/client";
import type { Env, Variables } from "../index";

export const journalsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Modul jurnal harian milik Peserta Didik (Fase 5).
 * Prinsip keamanan: SEMUA handler menurunkan kepemilikan dari database
 * (users.id pada JWT -> students.userId), tidak pernah menerima studentId
 * dari klien. requireOwnStudent() di rbac.ts TIDAK dipakai karena middleware
 * itu khusus relasi Guru Wali -> siswa binaan; di sini relasinya adalah
 * "user ini ADALAH siswa itu sendiri".
 */

/** Baris students milik user yang sedang login, atau undefined. */
async function findOwnStudent(db: Database, userId: string) {
  const [student] = await db.select().from(students).where(eq(students.userId, userId));
  return student;
}

/**
 * Jurnal milik user yang sedang login. Not-found dan bukan-milikmu sengaja
 * disatukan menjadi satu hasil "tidak ketemu" (nantinya 404) agar tidak
 * membocorkan keberadaan jurnal siswa lain.
 */
async function findOwnJournal(db: Database, userId: string, journalId: string) {
  const [row] = await db
    .select({ journal: journals })
    .from(journals)
    .innerJoin(students, eq(journals.studentId, students.id))
    .where(and(eq(journals.id, journalId), eq(students.userId, userId)));
  return row?.journal;
}

/**
 * Rantai konfigurasi aktif: tahun ajaran aktif -> semester aktif ->
 * template jurnal aktif untuk satu sekolah. Jika ada mata rantai yang
 * belum diaktifkan Admin, kembalikan errorCode eksplisit - tidak pernah
 * menebak diam-diam.
 */
async function resolveActiveSemesterAndTemplate(db: Database, schoolId: string) {
  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isActive, true)));
  if (!activeYear) {
    return {
      errorCode: "no_active_academic_year" as const,
      message: "Belum ada tahun pelajaran aktif. Hubungi Admin sekolah.",
    };
  }

  const [activeSemester] = await db
    .select()
    .from(semesters)
    .where(and(eq(semesters.academicYearId, activeYear.id), eq(semesters.isActive, true)));
  if (!activeSemester) {
    return {
      errorCode: "no_active_semester" as const,
      message: "Belum ada semester aktif. Hubungi Admin sekolah.",
    };
  }

  const [activeTemplate] = await db
    .select()
    .from(journalTemplates)
    .where(and(eq(journalTemplates.schoolId, schoolId), eq(journalTemplates.isActive, true)));
  if (!activeTemplate) {
    return {
      errorCode: "no_active_template" as const,
      message: "Belum ada template jurnal aktif. Hubungi Admin sekolah.",
    };
  }

  return { semester: activeSemester, template: activeTemplate };
}

/** Item jurnal + info item template (nama, tipe, urutan), terurut. */
async function listJournalItems(db: Database, journalId: string) {
  return db
    .select({
      id: journalItems.id,
      journalId: journalItems.journalId,
      templateItemId: journalItems.templateItemId,
      status: journalItems.status,
      recordedTime: journalItems.recordedTime,
      note: journalItems.note,
      photoUrl: journalItems.photoUrl,
      itemName: journalTemplateItems.itemName,
      itemType: journalTemplateItems.itemType,
      orderIndex: journalTemplateItems.orderIndex,
    })
    .from(journalItems)
    .innerJoin(journalTemplateItems, eq(journalItems.templateItemId, journalTemplateItems.id))
    .where(eq(journalItems.journalId, journalId))
    .orderBy(asc(journalTemplateItems.orderIndex));
}

const notFoundStudent = {
  error: "not_found",
  message: "Profil peserta didik untuk akun ini tidak ditemukan. Hubungi Admin sekolah.",
  statusCode: 404,
} as const;

const notFoundJournal = {
  error: "not_found",
  message: "Jurnal tidak ditemukan",
  statusCode: 404,
} as const;

const dateQuerySchema = z.object({ date: z.string().date() });

/**
 * GET /journals/today?date=YYYY-MM-DD
 * "Hari ini" dihitung frontend (WIB, lihat apps/web/lib/date.ts) agar API
 * tetap bebas asumsi zona waktu. {data: null} berarti belum ada jurnal
 * untuk tanggal itu - frontend yang memutuskan menampilkan tombol buat.
 */
journalsRoute.get(
  "/today",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VIEW_OWN),
  zValidator("query", dateQuerySchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { date } = c.req.valid("query");

    const student = await findOwnStudent(db, user.sub);
    if (!student) return c.json(notFoundStudent, 404);

    const [journal] = await db
      .select()
      .from(journals)
      .where(and(eq(journals.studentId, student.id), eq(journals.journalDate, date)));

    if (!journal) return c.json({ data: null });

    const items = await listJournalItems(db, journal.id);
    return c.json({ data: { journal, items } });
  }
);

const createJournalSchema = z.object({ journalDate: z.string().date() });

/**
 * POST /journals - buat jurnal draft untuk satu tanggal dari template aktif.
 * Idempoten: jika jurnal tanggal itu sudah ada, kembalikan yang sudah ada
 * (200) alih-alih error, agar tombol "Buat Jurnal" aman diklik dua kali.
 */
journalsRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_FILL),
  zValidator("json", createJournalSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { journalDate } = c.req.valid("json");

    const student = await findOwnStudent(db, user.sub);
    if (!student) return c.json(notFoundStudent, 404);

    const [existing] = await db
      .select()
      .from(journals)
      .where(and(eq(journals.studentId, student.id), eq(journals.journalDate, journalDate)));
    if (existing) {
      const items = await listJournalItems(db, existing.id);
      return c.json({ data: { journal: existing, items } });
    }

    const resolved = await resolveActiveSemesterAndTemplate(db, student.schoolId);
    if ("errorCode" in resolved) {
      return c.json({ error: resolved.errorCode, message: resolved.message, statusCode: 409 }, 409);
    }

    const templateItems = await db
      .select()
      .from(journalTemplateItems)
      .where(eq(journalTemplateItems.journalTemplateId, resolved.template.id))
      .orderBy(asc(journalTemplateItems.orderIndex));

    if (templateItems.length === 0) {
      return c.json(
        {
          error: "empty_template",
          message: "Template jurnal aktif belum memiliki item. Hubungi Admin sekolah.",
          statusCode: 409,
        },
        409
      );
    }

    const [journal] = await db
      .insert(journals)
      .values({
        studentId: student.id,
        journalTemplateId: resolved.template.id,
        semesterId: resolved.semester.id,
        journalDate,
        status: "draft",
      })
      .returning();

    try {
      for (const templateItem of templateItems) {
        await db.insert(journalItems).values({
          journalId: journal.id,
          templateItemId: templateItem.id,
          status: "belum",
        });
      }
    } catch (err) {
      // Kompensasi manual (pola teachers.ts): hapus jurnal yang terlanjur
      // dibuat; item yang sudah masuk ikut terhapus lewat ON DELETE CASCADE.
      await db.delete(journals).where(eq(journals.id, journal.id));
      throw err;
    }

    const items = await listJournalItems(db, journal.id);
    return c.json({ data: { journal, items } }, 201);
  }
);

/**
 * GET /journals - riwayat jurnal milik sendiri, terbaru dulu.
 * studentId dari klien sengaja diabaikan total.
 */
journalsRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VIEW_OWN),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");

    const student = await findOwnStudent(db, user.sub);
    if (!student) return c.json(notFoundStudent, 404);

    const result = await db
      .select()
      .from(journals)
      .where(eq(journals.studentId, student.id))
      .orderBy(desc(journals.journalDate));

    return c.json({ data: result });
  }
);

journalsRoute.get(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VIEW_OWN),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const journal = await findOwnJournal(db, user.sub, id);
    if (!journal) return c.json(notFoundJournal, 404);

    const items = await listJournalItems(db, journal.id);
    return c.json({ data: { journal, items } });
  }
);

const updateItemSchema = z
  .object({
    status: z.enum(["selesai", "belum", "sebagian"]).optional(),
    recordedTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Format waktu HH:MM")
      .nullish(),
    note: z.string().max(2000).nullish(),
    photoUrl: z.string().max(2048).nullish(),
  })
  .refine(
    (v) => v.status !== undefined || v.recordedTime !== undefined || v.note !== undefined || v.photoUrl !== undefined,
    { message: "Tidak ada field yang diubah" }
  );

journalsRoute.patch(
  "/:id/items/:itemId",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_FILL),
  zValidator("json", updateItemSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const itemId = c.req.param("itemId");
    const body = c.req.valid("json");

    const journal = await findOwnJournal(db, user.sub, id);
    if (!journal) return c.json(notFoundJournal, 404);

    if (journal.status !== "draft") {
      return c.json(
        {
          error: "forbidden",
          message: "Jurnal yang sudah dikirim tidak bisa diubah lagi",
          statusCode: 403,
        },
        403
      );
    }

    const [existing] = await db
      .select()
      .from(journalItems)
      .where(and(eq(journalItems.id, itemId), eq(journalItems.journalId, journal.id)));
    if (!existing) {
      return c.json(
        { error: "not_found", message: "Item jurnal tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const [updated] = await db
      .update(journalItems)
      .set({
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.recordedTime !== undefined ? { recordedTime: body.recordedTime } : {}),
        ...(body.note !== undefined ? { note: body.note } : {}),
        ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
      })
      .where(eq(journalItems.id, itemId))
      .returning();

    return c.json({ data: updated });
  }
);

journalsRoute.patch(
  "/:id/submit",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_FILL),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const journal = await findOwnJournal(db, user.sub, id);
    if (!journal) return c.json(notFoundJournal, 404);

    if (journal.status !== "draft") {
      return c.json(
        {
          error: "conflict",
          message: "Jurnal ini sudah dikirim sebelumnya",
          statusCode: 409,
        },
        409
      );
    }

    const [submitted] = await db
      .update(journals)
      .set({ status: "submitted", submittedAt: new Date() })
      .where(eq(journals.id, journal.id))
      .returning();

    return c.json({ data: submitted });
  }
);
