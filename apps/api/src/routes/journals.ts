import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc, desc, gte, lte, isNotNull, sql } from "drizzle-orm";
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
  verifications,
  teacherStudent,
  evidenceRequirements,
} from "../db/schema";
import { listComments } from "../services/comments";
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
      description: journalTemplateItems.description,
      requiresPhoto: journalTemplateItems.requiresPhoto,
    })
    .from(journalItems)
    .innerJoin(journalTemplateItems, eq(journalItems.templateItemId, journalTemplateItems.id))
    .where(eq(journalItems.journalId, journalId))
    .orderBy(asc(journalTemplateItems.orderIndex));
}

/**
 * Hasil verifikasi Guru Wali untuk satu jurnal (atau null). Disertakan di
 * respons detail jurnal agar siswa bisa melihat nilai karakter & catatan,
 * termasuk catatan revisi saat jurnal dikembalikan menjadi draft (Fase 6).
 */
async function findVerification(db: Database, journalId: string) {
  const [verification] = await db
    .select()
    .from(verifications)
    .where(eq(verifications.journalId, journalId));
  return verification ?? null;
}

/**
 * Daftar kebiasaan wajib berbukti foto untuk satu jurnal (revisi Juli 2026).
 * Prioritas (keputusan desain):
 * 1. Bukti Harian yang ditetapkan Guru Wali AKTIF siswa untuk tanggal itu
 *    (evidence_requirements) - jika ada, HANYA itu yang berlaku (menang
 *    atas default template). Diturunkan dari teacher_student (isActive),
 *    bukan dari klien.
 * 2. Jika guru tidak menetapkan Bukti Harian: item template yang ditandai
 *    `requiresPhoto` berlaku sebagai DEFAULT (bisa lebih dari satu).
 * Hasil [] berarti tidak ada kewajiban spesifik - validasi submit kembali
 * ke aturan lama "minimal satu foto pada kebiasaan mana pun".
 */
export interface RequiredPhotoItem {
  templateItemId: string;
  itemName: string;
  source: "harian" | "template";
}

async function findEvidenceRequirements(
  db: Database,
  studentId: string,
  journalDate: string,
  journalTemplateId: string
): Promise<RequiredPhotoItem[]> {
  const [daily] = await db
    .select({
      templateItemId: evidenceRequirements.templateItemId,
      itemName: journalTemplateItems.itemName,
    })
    .from(evidenceRequirements)
    .innerJoin(
      teacherStudent,
      and(
        eq(teacherStudent.teacherId, evidenceRequirements.teacherId),
        eq(teacherStudent.studentId, studentId),
        eq(teacherStudent.isActive, true)
      )
    )
    .innerJoin(
      journalTemplateItems,
      eq(evidenceRequirements.templateItemId, journalTemplateItems.id)
    )
    .where(eq(evidenceRequirements.requirementDate, journalDate));

  if (daily) return [{ ...daily, source: "harian" }];

  const defaults = await db
    .select({
      templateItemId: journalTemplateItems.id,
      itemName: journalTemplateItems.itemName,
    })
    .from(journalTemplateItems)
    .where(
      and(
        eq(journalTemplateItems.journalTemplateId, journalTemplateId),
        eq(journalTemplateItems.requiresPhoto, true)
      )
    )
    .orderBy(asc(journalTemplateItems.orderIndex));

  return defaults.map((d) => ({ ...d, source: "template" as const }));
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
    const verification = await findVerification(db, journal.id);
    const requiredPhotoItems = await findEvidenceRequirements(
      db,
      student.id,
      journal.journalDate,
      journal.journalTemplateId
    );
    return c.json({ data: { journal, items, verification, evidenceRequirements: requiredPhotoItems } });
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
      const verification = await findVerification(db, existing.id);
      const requiredPhotoItems = await findEvidenceRequirements(
        db,
        student.id,
        journalDate,
        existing.journalTemplateId
      );
      return c.json({
        data: { journal: existing, items, verification, evidenceRequirements: requiredPhotoItems },
      });
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
    const requiredPhotoItems = await findEvidenceRequirements(
      db,
      student.id,
      journalDate,
      journal.journalTemplateId
    );
    return c.json(
      { data: { journal, items, verification: null, evidenceRequirements: requiredPhotoItems } },
      201
    );
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

const statsQuerySchema = z.object({
  date: z.string().date(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan YYYY-MM"),
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

/**
 * GET /journals/stats?date=YYYY-MM-DD&month=YYYY-MM&days=30
 * Data dashboard Peserta Didik (kalender + diagram):
 * - distribution : status jurnal milik sendiri `days` hari terakhir
 * - avgScore     : rata-rata nilai karakter `days` hari terakhir (atau null)
 * - scoreTrend   : 7 hari terakhir, nilai karakter per tanggal (null = belum dinilai)
 * - calendar     : status jurnal per tanggal pada bulan `month`
 *
 * PENTING: rute ini WAJIB terdaftar SEBELUM GET /:id agar "/stats" tidak
 * tertangkap sebagai parameter id. "Hari ini" dikirim frontend via ?date=
 * (WIB, pola sama /journals/today).
 */
journalsRoute.get(
  "/stats",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VIEW_OWN),
  zValidator("query", statsQuerySchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { date, month, days } = c.req.valid("query");

    const student = await findOwnStudent(db, user.sub);
    if (!student) return c.json(notFoundStudent, 404);

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const asDate = new Date(`${date}T00:00:00Z`);
    const rangeStart = iso(new Date(asDate.getTime() - (days - 1) * 86400000));
    const trendStart = iso(new Date(asDate.getTime() - 6 * 86400000));
    const [yearNum, monthNum] = month.split("-").map(Number);
    const monthStart = `${month}-01`;
    const monthEnd = iso(new Date(Date.UTC(yearNum, monthNum, 0)));

    // ---- Distribusi status jurnal `days` hari terakhir ----
    const distRows = await db
      .select({
        status: journals.status,
        count: sql<number>`count(*)::int`,
      })
      .from(journals)
      .where(
        and(
          eq(journals.studentId, student.id),
          gte(journals.journalDate, rangeStart),
          lte(journals.journalDate, date)
        )
      )
      .groupBy(journals.status);

    const distribution = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
    for (const row of distRows) distribution[row.status] = row.count;

    // ---- Rata-rata nilai karakter `days` hari terakhir ----
    const [avgRow] = await db
      .select({
        avgScore: sql<number | null>`round(avg(${verifications.characterScore}))::int`,
      })
      .from(verifications)
      .innerJoin(journals, eq(verifications.journalId, journals.id))
      .where(
        and(
          eq(journals.studentId, student.id),
          isNotNull(verifications.characterScore),
          gte(journals.journalDate, rangeStart),
          lte(journals.journalDate, date)
        )
      );

    // ---- Nilai karakter 7 hari terakhir (satu jurnal per tanggal) ----
    const scoreRows = await db
      .select({
        journalDate: journals.journalDate,
        score: verifications.characterScore,
      })
      .from(verifications)
      .innerJoin(journals, eq(verifications.journalId, journals.id))
      .where(
        and(
          eq(journals.studentId, student.id),
          isNotNull(verifications.characterScore),
          gte(journals.journalDate, trendStart),
          lte(journals.journalDate, date)
        )
      );

    const scoreMap = new Map(scoreRows.map((r) => [r.journalDate, r.score]));
    const scoreTrend: { date: string; score: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = iso(new Date(asDate.getTime() - i * 86400000));
      scoreTrend.push({ date: d, score: scoreMap.get(d) ?? null });
    }

    // ---- Kalender: status jurnal per tanggal bulan `month` ----
    const calendar = await db
      .select({
        date: journals.journalDate,
        status: journals.status,
      })
      .from(journals)
      .where(
        and(
          eq(journals.studentId, student.id),
          gte(journals.journalDate, monthStart),
          lte(journals.journalDate, monthEnd)
        )
      )
      .orderBy(asc(journals.journalDate));

    return c.json({
      data: {
        date,
        month,
        days,
        distribution,
        avgScore: avgRow?.avgScore ?? null,
        scoreTrend,
        calendar,
      },
    });
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
    const verification = await findVerification(db, journal.id);
    const requiredPhotoItems = await findEvidenceRequirements(
      db,
      journal.studentId,
      journal.journalDate,
      journal.journalTemplateId
    );
    // Komentar orang tua (Fase 7) ikut ditampilkan ke siswa pemilik jurnal.
    const commentList = await listComments(db, journal.id);
    return c.json({
      data: {
        journal,
        items,
        verification,
        evidenceRequirements: requiredPhotoItems,
        comments: commentList,
      },
    });
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

    // ---------- Validasi 7 Kebiasaan Anak Indonesia Hebat ----------
    // Aturan 1: SEMUA item wajib terisi. Item dianggap terisi jika
    // statusnya selesai/sebagian, ATAU berstatus "belum" DENGAN keterangan
    // (siswa boleh tidak melakukan kebiasaan, tapi wajib menjelaskan).
    const items = await listJournalItems(db, journal.id);

    const incomplete = items.filter(
      (i) => i.status === "belum" && (i.note ?? "").trim() === ""
    );
    if (incomplete.length > 0) {
      return c.json(
        {
          error: "incomplete_items",
          message:
            "Semua kebiasaan wajib diisi. Lengkapi (atau beri keterangan jika belum dilakukan): " +
            incomplete.map((i) => i.itemName).join(", "),
          statusCode: 422,
        },
        422
      );
    }

    // Aturan 2: WAJIB ada minimal SATU foto bukti (revisi Juli 2026).
    // - Daftar kebiasaan wajib berbukti datang dari findEvidenceRequirements:
    //   Bukti Harian guru wali (menang) ATAU default requiresPhoto template.
    // - Setiap kebiasaan wajib yang DIKERJAKAN (status bukan "belum") harus
    //   berfoto. Item wajib berstatus "belum" (tidak dilakukan, sudah
    //   berketerangan) dikecualikan - memotret kebiasaan yang tidak
    //   dilakukan mustahil.
    // - Jika tidak ada satu pun kebiasaan wajib yang efektif: fallback lama,
    //   foto minimal satu pada kebiasaan mana pun.
    const requirements = await findEvidenceRequirements(
      db,
      journal.studentId,
      journal.journalDate,
      journal.journalTemplateId
    );
    const requiredItems = items.filter(
      (i) =>
        requirements.some((r) => r.templateItemId === i.templateItemId) && i.status !== "belum"
    );

    const missingPhoto = requiredItems.filter((i) => (i.photoUrl ?? "").trim() === "");
    if (missingPhoto.length > 0) {
      const source = requirements[0]?.source === "harian" ? "Guru Wali" : "Template jurnal";
      return c.json(
        {
          error: "missing_required_photo",
          message:
            `${source} mewajibkan foto bukti pada kebiasaan: ` +
            missingPhoto.map((i) => `"${i.itemName}"`).join(", ") +
            ". Lampirkan fotonya sebelum mengirim.",
          statusCode: 422,
        },
        422
      );
    }

    if (requiredItems.length === 0 && !items.some((i) => (i.photoUrl ?? "").trim() !== "")) {
      return c.json(
        {
          error: "missing_photo",
          message:
            "Lampirkan minimal satu foto bukti pada salah satu kebiasaan sebelum mengirim jurnal.",
          statusCode: 422,
        },
        422
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
