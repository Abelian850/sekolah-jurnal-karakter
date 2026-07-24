import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc, desc } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  students,
  parents,
  studentParent,
  journals,
  journalItems,
  journalTemplateItems,
  verifications,
  teacherStudent,
  teachers,
  comments,
  notifications,
} from "../db/schema";
import { listComments } from "../services/comments";
import type { Database } from "../db/client";
import type { Env, Variables } from "../index";

export const childrenRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Modul Orang Tua (Fase 7): melihat jurnal anak (JOURNAL_VIEW_CHILD) dan
 * menulis komentar (COMMENT_CREATE).
 * Prinsip keamanan sama dengan journals.ts: kepemilikan SELALU diturunkan
 * dari database (users.id JWT -> parents.userId -> student_parent), tidak
 * pernah mempercayai studentId/journalId polos dari klien. Not-found dan
 * bukan-anakmu disatukan menjadi 404 agar tidak membocorkan data anak lain.
 */

async function findOwnParent(db: Database, userId: string) {
  const [parent] = await db.select().from(parents).where(eq(parents.userId, userId));
  return parent;
}

/** Jurnal milik salah satu anak tertaut orang tua ini, atau undefined. */
async function findChildJournal(db: Database, parentUserId: string, journalId: string) {
  const [row] = await db
    .select({ journal: journals, student: students })
    .from(journals)
    .innerJoin(students, eq(journals.studentId, students.id))
    .innerJoin(studentParent, eq(studentParent.studentId, students.id))
    .innerJoin(parents, eq(studentParent.parentId, parents.id))
    .where(and(eq(journals.id, journalId), eq(parents.userId, parentUserId)));
  return row;
}

const notFoundParent = {
  error: "not_found",
  message: "Profil orang tua untuk akun ini tidak ditemukan. Hubungi Admin sekolah.",
  statusCode: 404,
} as const;

const notFoundJournal = {
  error: "not_found",
  message: "Jurnal tidak ditemukan",
  statusCode: 404,
} as const;

/** GET /children - daftar anak yang tertaut ke orang tua ini. */
childrenRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VIEW_CHILD),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");

    const parent = await findOwnParent(db, user.sub);
    if (!parent) return c.json(notFoundParent, 404);

    const result = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        nis: students.nis,
        nisn: students.nisn,
        className: students.className,
        gradeLevel: students.gradeLevel,
        photoUrl: students.photoUrl,
        isActive: students.isActive,
      })
      .from(studentParent)
      .innerJoin(students, eq(studentParent.studentId, students.id))
      .where(eq(studentParent.parentId, parent.id))
      .orderBy(asc(students.fullName));

    return c.json({ data: result });
  }
);

/**
 * GET /children/journals/:id - detail jurnal anak (read-only):
 * jurnal + identitas anak + item + hasil verifikasi + komentar.
 * Didaftarkan SEBELUM /:studentId/journals agar segmen literal "journals"
 * tidak tertangkap sebagai :studentId.
 */
childrenRoute.get(
  "/journals/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VIEW_CHILD),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const row = await findChildJournal(db, user.sub, id);
    if (!row) return c.json(notFoundJournal, 404);

    const items = await db
      .select({
        id: journalItems.id,
        journalId: journalItems.journalId,
        templateItemId: journalItems.templateItemId,
        status: journalItems.status,
        recordedTime: journalItems.recordedTime,
        note: journalItems.note,
        photoUrl: journalItems.photoUrl,
        answers: journalItems.answers,
        itemName: journalTemplateItems.itemName,
        itemType: journalTemplateItems.itemType,
        orderIndex: journalTemplateItems.orderIndex,
      })
      .from(journalItems)
      .innerJoin(journalTemplateItems, eq(journalItems.templateItemId, journalTemplateItems.id))
      .where(eq(journalItems.journalId, row.journal.id))
      .orderBy(asc(journalTemplateItems.orderIndex));

    const [verification] = await db
      .select()
      .from(verifications)
      .where(eq(verifications.journalId, row.journal.id));

    const commentList = await listComments(db, row.journal.id);

    return c.json({
      data: {
        journal: row.journal,
        student: row.student,
        items,
        verification: verification ?? null,
        comments: commentList,
      },
    });
  }
);

const createCommentSchema = z.object({ body: z.string().trim().min(1).max(2000) });

/**
 * POST /children/journals/:id/comments - tulis komentar pada jurnal anak.
 * Efek samping: notifikasi tipe "komentar" ke siswa pemilik jurnal dan ke
 * Guru Wali AKTIF anak tsb (agar terlihat saat memeriksa jurnal).
 */
childrenRoute.post(
  "/journals/:id/comments",
  authMiddleware,
  requirePermission(PERMISSIONS.COMMENT_CREATE),
  zValidator("json", createCommentSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const { body } = c.req.valid("json");

    const parent = await findOwnParent(db, user.sub);
    if (!parent) return c.json(notFoundParent, 404);

    const row = await findChildJournal(db, user.sub, id);
    if (!row) return c.json(notFoundJournal, 404);

    const [comment] = await db
      .insert(comments)
      .values({ journalId: row.journal.id, userId: user.sub, body })
      .returning();

    // ---------- Notifikasi: siswa + guru wali aktif ----------
    const [studentUser] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, row.student.id));

    const guruWaliRows = await db
      .select({ userId: teachers.userId })
      .from(teacherStudent)
      .innerJoin(teachers, eq(teacherStudent.teacherId, teachers.id))
      .where(and(eq(teacherStudent.studentId, row.student.id), eq(teacherStudent.isActive, true)));

    const recipients = [
      ...(studentUser ? [studentUser.userId] : []),
      ...guruWaliRows.map((t) => t.userId),
    ];
    for (const userId of recipients) {
      await db.insert(notifications).values({
        userId,
        type: "komentar",
        title: "Komentar baru dari orang tua",
        message: `${parent.fullName} mengomentari jurnal ${row.student.fullName} tanggal ${row.journal.journalDate}: "${body.length > 120 ? body.slice(0, 120) + "…" : body}"`,
      });
    }

    return c.json({ data: comment }, 201);
  }
);

/**
 * GET /children/:studentId/journals - riwayat jurnal satu anak, terbaru
 * dulu, plus ringkasan hasil verifikasi (status & nilai) per jurnal.
 */
childrenRoute.get(
  "/:studentId/journals",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VIEW_CHILD),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const studentId = c.req.param("studentId");

    const parent = await findOwnParent(db, user.sub);
    if (!parent) return c.json(notFoundParent, 404);

    // Pastikan anak ini memang tertaut ke orang tua yang login.
    const [link] = await db
      .select({ id: studentParent.id })
      .from(studentParent)
      .where(and(eq(studentParent.parentId, parent.id), eq(studentParent.studentId, studentId)));
    if (!link) {
      return c.json(
        { error: "not_found", message: "Data anak tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const result = await db
      .select({
        id: journals.id,
        journalDate: journals.journalDate,
        status: journals.status,
        submittedAt: journals.submittedAt,
        verificationStatus: verifications.status,
        characterScore: verifications.characterScore,
        verificationNote: verifications.note,
      })
      .from(journals)
      .leftJoin(verifications, eq(verifications.journalId, journals.id))
      .where(eq(journals.studentId, studentId))
      .orderBy(desc(journals.journalDate))
      .limit(60);

    return c.json({ data: result });
  }
);
