import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc, desc, gte, lte, sql } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  students,
  teachers,
  teacherStudent,
  journals,
  journalItems,
  journalTemplateItems,
  verifications,
  evidenceRequirements,
  notifications,
  studentParent,
  parents,
  auditLogs,
} from "../db/schema";
import { listComments } from "../services/comments";
import type { Database } from "../db/client";
import type { Env, Variables } from "../index";

export const verificationsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Modul verifikasi & penilaian karakter oleh Guru Wali (Fase 6).
 *
 * Prinsip keamanan sama dengan journals.ts: identitas guru SELALU diturunkan
 * dari database (users.id pada JWT -> teachers.userId), dan setiap jurnal yang
 * diakses WAJIB terbukti milik siswa binaan aktif guru tersebut lewat join ke
 * teacher_student - bukan dari parameter yang dikirim klien.
 *
 * Alur status (keputusan desain Fase 6):
 * - "disetujui" -> journals.status = approved (final) + nilai karakter WAJIB
 * - "ditolak"   -> journals.status = rejected (final) + catatan WAJIB
 * - "revisi"    -> journals.status = draft (siswa memperbaiki lalu kirim ulang;
 *                  baris verifications di-UPSERT saat guru menilai ulang)
 */

/** Baris teachers milik user yang sedang login, atau undefined. */
async function findOwnTeacher(db: Database, userId: string) {
  const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, userId));
  return teacher;
}

/**
 * Jurnal milik siswa binaan AKTIF guru yang sedang login, beserta info siswa.
 * Bukan-binaan dan tidak-ada sengaja disatukan menjadi "tidak ketemu" (404)
 * agar tidak membocorkan keberadaan jurnal siswa lain.
 */
async function findBinaanJournal(db: Database, teacherUserId: string, journalId: string) {
  const [row] = await db
    .select({
      journal: journals,
      student: {
        id: students.id,
        fullName: students.fullName,
        className: students.className,
        nis: students.nis,
      },
    })
    .from(journals)
    .innerJoin(students, eq(journals.studentId, students.id))
    .innerJoin(
      teacherStudent,
      and(eq(teacherStudent.studentId, students.id), eq(teacherStudent.isActive, true))
    )
    .innerJoin(teachers, eq(teacherStudent.teacherId, teachers.id))
    .where(and(eq(journals.id, journalId), eq(teachers.userId, teacherUserId)));
  return row;
}

/** Item jurnal + info item template, terurut (duplikat kecil dari journals.ts). */
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

const notFoundTeacher = {
  error: "not_found",
  message: "Profil guru untuk akun ini tidak ditemukan. Hubungi Admin sekolah.",
  statusCode: 404,
} as const;

const notFoundJournal = {
  error: "not_found",
  message: "Jurnal tidak ditemukan atau bukan milik siswa binaan Anda",
  statusCode: 404,
} as const;

/**
 * GET /verifications/pending
 * Daftar jurnal berstatus "submitted" milik semua siswa binaan aktif guru
 * yang sedang login, terlama dulu (yang paling lama menunggu diproses dulu).
 */
verificationsRoute.get(
  "/pending",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");

    const teacher = await findOwnTeacher(db, user.sub);
    if (!teacher) return c.json(notFoundTeacher, 404);

    const result = await db
      .select({
        id: journals.id,
        journalDate: journals.journalDate,
        status: journals.status,
        submittedAt: journals.submittedAt,
        studentId: students.id,
        studentName: students.fullName,
        className: students.className,
      })
      .from(journals)
      .innerJoin(students, eq(journals.studentId, students.id))
      .innerJoin(
        teacherStudent,
        and(eq(teacherStudent.studentId, students.id), eq(teacherStudent.isActive, true))
      )
      .where(and(eq(teacherStudent.teacherId, teacher.id), eq(journals.status, "submitted")))
      .orderBy(asc(journals.submittedAt));

    return c.json({ data: result });
  }
);

/**
 * GET /verifications/history
 * Riwayat verifikasi yang PERNAH dilakukan guru ini, terbaru dulu.
 * Termasuk jurnal berstatus draft kembali (kasus "revisi") agar guru bisa
 * melihat bahwa ia pernah meminta revisi pada jurnal tersebut.
 */
verificationsRoute.get(
  "/history",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");

    const teacher = await findOwnTeacher(db, user.sub);
    if (!teacher) return c.json(notFoundTeacher, 404);

    const result = await db
      .select({
        id: verifications.id,
        journalId: verifications.journalId,
        status: verifications.status,
        note: verifications.note,
        characterScore: verifications.characterScore,
        verifiedAt: verifications.verifiedAt,
        journalDate: journals.journalDate,
        journalStatus: journals.status,
        studentName: students.fullName,
        className: students.className,
      })
      .from(verifications)
      .innerJoin(journals, eq(verifications.journalId, journals.id))
      .innerJoin(students, eq(journals.studentId, students.id))
      .where(eq(verifications.teacherId, teacher.id))
      .orderBy(desc(verifications.verifiedAt))
      .limit(100);

    return c.json({ data: result });
  }
);

const statsQuerySchema = z.object({
  date: z.string().date(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan YYYY-MM"),
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

/**
 * GET /verifications/stats?date=YYYY-MM-DD&month=YYYY-MM&days=30
 * Data dashboard Guru Wali (kartu ringkasan + kalender + diagram):
 * - counts       : siswa binaan aktif + jurnal menunggu diperiksa (semua waktu)
 * - verification : distribusi hasil verifikasi guru INI `days` hari terakhir
 *                  (+ menunggu = submitted binaan yang belum diverifikasi)
 * - trend        : 7 hari terakhir, jurnal terkirim per tanggal (siswa binaan)
 * - calendar     : rekap status jurnal binaan per tanggal pada bulan `month`
 *
 * "Hari ini" dikirim frontend via ?date= (WIB, pola sama /journals/today).
 * Semua query diturunkan dari teacher_student aktif milik guru yang login -
 * tidak pernah menerima teacherId/studentId dari klien (prinsip file ini).
 */
verificationsRoute.get(
  "/stats",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  zValidator("query", statsQuerySchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { date, month, days } = c.req.valid("query");

    const teacher = await findOwnTeacher(db, user.sub);
    if (!teacher) return c.json(notFoundTeacher, 404);

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const asDate = new Date(`${date}T00:00:00Z`);
    const rangeStart = iso(new Date(asDate.getTime() - (days - 1) * 86400000));
    const trendStart = iso(new Date(asDate.getTime() - 6 * 86400000));
    const [yearNum, monthNum] = month.split("-").map(Number);
    const monthStart = `${month}-01`;
    const monthEnd = iso(new Date(Date.UTC(yearNum, monthNum, 0)));

    // Join standar "jurnal milik siswa binaan aktif guru ini".
    const binaanJoin = and(
      eq(teacherStudent.studentId, journals.studentId),
      eq(teacherStudent.isActive, true)
    );

    // ---- Kartu ringkasan ----
    const [binaan] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(teacherStudent)
      .where(and(eq(teacherStudent.teacherId, teacher.id), eq(teacherStudent.isActive, true)));

    const [pending] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(journals)
      .innerJoin(teacherStudent, binaanJoin)
      .where(and(eq(teacherStudent.teacherId, teacher.id), eq(journals.status, "submitted")));

    // ---- Distribusi verifikasi `days` hari terakhir ----
    const verifRows = await db
      .select({
        status: verifications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(verifications)
      .innerJoin(journals, eq(verifications.journalId, journals.id))
      .where(
        and(
          eq(verifications.teacherId, teacher.id),
          gte(journals.journalDate, rangeStart),
          lte(journals.journalDate, date)
        )
      )
      .groupBy(verifications.status);

    const verification = { disetujui: 0, ditolak: 0, revisi: 0, menunggu: 0 };
    for (const row of verifRows) verification[row.status] = row.count;

    const [waiting] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(journals)
      .innerJoin(teacherStudent, binaanJoin)
      .leftJoin(verifications, eq(verifications.journalId, journals.id))
      .where(
        and(
          eq(teacherStudent.teacherId, teacher.id),
          eq(journals.status, "submitted"),
          sql`${verifications.id} is null`,
          gte(journals.journalDate, rangeStart),
          lte(journals.journalDate, date)
        )
      );
    verification.menunggu = waiting?.count ?? 0;

    // ---- Tren 7 hari terakhir: jurnal binaan terkirim per tanggal ----
    const trendRows = await db
      .select({
        journalDate: journals.journalDate,
        sent: sql<number>`count(*) filter (where ${journals.status} in ('submitted','approved','rejected'))::int`,
      })
      .from(journals)
      .innerJoin(teacherStudent, binaanJoin)
      .where(
        and(
          eq(teacherStudent.teacherId, teacher.id),
          gte(journals.journalDate, trendStart),
          lte(journals.journalDate, date)
        )
      )
      .groupBy(journals.journalDate)
      .orderBy(asc(journals.journalDate));

    const trendMap = new Map(trendRows.map((r) => [r.journalDate, r.sent]));
    const trend: { date: string; sent: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = iso(new Date(asDate.getTime() - i * 86400000));
      trend.push({ date: d, sent: trendMap.get(d) ?? 0 });
    }

    // ---- Kalender: rekap status jurnal binaan per tanggal bulan `month` ----
    const calendar = await db
      .select({
        date: journals.journalDate,
        draft: sql<number>`count(*) filter (where ${journals.status} = 'draft')::int`,
        submitted: sql<number>`count(*) filter (where ${journals.status} = 'submitted')::int`,
        approved: sql<number>`count(*) filter (where ${journals.status} = 'approved')::int`,
        rejected: sql<number>`count(*) filter (where ${journals.status} = 'rejected')::int`,
      })
      .from(journals)
      .innerJoin(teacherStudent, binaanJoin)
      .where(
        and(
          eq(teacherStudent.teacherId, teacher.id),
          gte(journals.journalDate, monthStart),
          lte(journals.journalDate, monthEnd)
        )
      )
      .groupBy(journals.journalDate)
      .orderBy(asc(journals.journalDate));

    return c.json({
      data: {
        date,
        month,
        days,
        counts: {
          activeStudents: binaan?.count ?? 0,
          pending: pending?.count ?? 0,
        },
        verification,
        trend,
        calendar,
      },
    });
  }
);

/**
 * GET /verifications/journals/:id
 * Detail satu jurnal siswa binaan: jurnal + identitas siswa + item + hasil
 * verifikasi sebelumnya (jika ada, mis. kasus revisi yang dikirim ulang).
 */
verificationsRoute.get(
  "/journals/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const row = await findBinaanJournal(db, user.sub, id);
    if (!row) return c.json(notFoundJournal, 404);

    const items = await listJournalItems(db, row.journal.id);
    const [verification] = await db
      .select()
      .from(verifications)
      .where(eq(verifications.journalId, row.journal.id));

    // Kebiasaan wajib berbukti untuk jurnal ini - ditampilkan di halaman
    // periksa agar guru ingat apa yang diwajibkan hari itu. Prioritas sama
    // dengan validasi submit di journals.ts (revisi Juli 2026): Bukti Harian
    // yang guru INI tetapkan menang; jika tidak ada, default requiresPhoto
    // dari template jurnal tsb.
    const teacher = await findOwnTeacher(db, user.sub);
    let requiredPhotoItems: Array<{
      templateItemId: string;
      itemName: string;
      source: "harian" | "template";
    }> = [];
    if (teacher) {
      const [req] = await db
        .select({
          templateItemId: evidenceRequirements.templateItemId,
          itemName: journalTemplateItems.itemName,
        })
        .from(evidenceRequirements)
        .innerJoin(
          journalTemplateItems,
          eq(evidenceRequirements.templateItemId, journalTemplateItems.id)
        )
        .where(
          and(
            eq(evidenceRequirements.teacherId, teacher.id),
            eq(evidenceRequirements.requirementDate, row.journal.journalDate)
          )
        );
      if (req) requiredPhotoItems = [{ ...req, source: "harian" }];
    }
    if (requiredPhotoItems.length === 0) {
      const defaults = await db
        .select({
          templateItemId: journalTemplateItems.id,
          itemName: journalTemplateItems.itemName,
        })
        .from(journalTemplateItems)
        .where(
          and(
            eq(journalTemplateItems.journalTemplateId, row.journal.journalTemplateId),
            eq(journalTemplateItems.requiresPhoto, true)
          )
        );
      requiredPhotoItems = defaults.map((d) => ({ ...d, source: "template" as const }));
    }

    // Komentar orang tua (Fase 7) tampil di halaman periksa guru wali.
    const commentList = await listComments(db, row.journal.id);

    return c.json({
      data: {
        journal: row.journal,
        student: row.student,
        items,
        verification: verification ?? null,
        evidenceRequirements: requiredPhotoItems,
        comments: commentList,
      },
    });
  }
);

const verifySchema = z
  .object({
    status: z.enum(["disetujui", "ditolak", "revisi"]),
    note: z.string().max(2000).nullish(),
    characterScore: z.number().int().min(1).max(100).nullish(),
  })
  .refine((v) => v.status !== "disetujui" || v.characterScore != null, {
    message: "Nilai karakter (1-100) wajib diisi saat menyetujui jurnal",
  })
  .refine((v) => v.status === "disetujui" || (v.note != null && v.note.trim().length > 0), {
    message: "Catatan wajib diisi saat menolak atau meminta revisi",
  });

/**
 * POST /verifications/journals/:id
 * Memverifikasi satu jurnal submitted. Efek samping:
 * 1. UPSERT baris verifications (unik per jurnal - guru terakhir yang menilai
 *    ulang jurnal revisi akan menimpa hasil sebelumnya).
 * 2. Update journals.status sesuai peta di komentar atas file ini.
 * 3. Buat notifikasi untuk siswa DAN semua orang tua yang tertaut.
 * 4. Catat audit log.
 */
verificationsRoute.post(
  "/journals/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  zValidator("json", verifySchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const teacher = await findOwnTeacher(db, user.sub);
    if (!teacher) return c.json(notFoundTeacher, 404);

    const row = await findBinaanJournal(db, user.sub, id);
    if (!row) return c.json(notFoundJournal, 404);

    if (row.journal.status !== "submitted") {
      return c.json(
        {
          error: "conflict",
          message:
            row.journal.status === "draft"
              ? "Jurnal ini masih draf (belum dikirim siswa atau sedang direvisi)"
              : "Jurnal ini sudah diverifikasi final",
          statusCode: 409,
        },
        409
      );
    }

    const verificationValues = {
      teacherId: teacher.id,
      status: body.status,
      note: body.note ?? null,
      characterScore: body.status === "disetujui" ? (body.characterScore ?? null) : null,
      verifiedAt: new Date(),
    };

    const [verification] = await db
      .insert(verifications)
      .values({ journalId: row.journal.id, ...verificationValues })
      .onConflictDoUpdate({ target: verifications.journalId, set: verificationValues })
      .returning();

    const journalStatus =
      body.status === "disetujui" ? "approved" : body.status === "ditolak" ? "rejected" : "draft";

    const [updatedJournal] = await db
      .update(journals)
      .set({ status: journalStatus })
      .where(eq(journals.id, row.journal.id))
      .returning();

    // ---------- Notifikasi untuk siswa + orang tua tertaut ----------
    const [studentRow] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, row.student.id));

    const parentRows = await db
      .select({ userId: parents.userId })
      .from(studentParent)
      .innerJoin(parents, eq(studentParent.parentId, parents.id))
      .where(eq(studentParent.studentId, row.student.id));

    const tanggal = row.journal.journalDate;
    const content = {
      disetujui: {
        title: "Jurnal disetujui",
        message: `Jurnal tanggal ${tanggal} disetujui oleh ${teacher.fullName}${
          verification.characterScore != null ? ` dengan nilai karakter ${verification.characterScore}` : ""
        }.${verification.note ? ` Catatan: ${verification.note}` : ""}`,
      },
      ditolak: {
        title: "Jurnal ditolak",
        message: `Jurnal tanggal ${tanggal} ditolak oleh ${teacher.fullName}. Catatan: ${verification.note}`,
      },
      revisi: {
        title: "Jurnal perlu revisi",
        message: `Jurnal tanggal ${tanggal} dikembalikan oleh ${teacher.fullName} untuk diperbaiki, lalu kirim ulang. Catatan: ${verification.note}`,
      },
    }[body.status];

    const recipientUserIds = [
      ...(studentRow ? [studentRow.userId] : []),
      ...parentRows.map((p) => p.userId),
    ];
    for (const userId of recipientUserIds) {
      await db.insert(notifications).values({
        userId,
        type: body.status,
        title: content.title,
        message:
          userId === studentRow?.userId
            ? content.message
            : `[${row.student.fullName}] ${content.message}`,
      });
    }

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "verify",
      tableName: "verifications",
      recordId: verification.id,
      oldValue: { journalStatus: row.journal.status },
      newValue: verification,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { verification, journal: updatedJournal } }, 201);
  }
);
