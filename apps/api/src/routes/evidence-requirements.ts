import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  teachers,
  journalTemplates,
  journalTemplateItems,
  evidenceRequirements,
  auditLogs,
} from "../db/schema";
import type { Database } from "../db/client";
import type { Env, Variables } from "../index";

export const evidenceRequirementsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Kebiasaan wajib berbukti foto per hari (requirement 7 Kebiasaan Anak
 * Indonesia Hebat). Guru Wali memilih SATU item dari template jurnal aktif
 * sekolahnya; pilihan berlaku untuk SEMUA siswa binaannya pada tanggal itu.
 *
 * Prinsip keamanan sama dengan verifications.ts: identitas guru diturunkan
 * dari database (users.id pada JWT -> teachers.userId), bukan dari klien.
 * Permission memakai JOURNAL_VERIFY karena fitur ini bagian dari tanggung
 * jawab verifikasi Guru Wali (tidak menambah permission baru).
 */

/** Baris teachers milik user yang sedang login, atau undefined. */
async function findOwnTeacher(db: Database, userId: string) {
  const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, userId));
  return teacher;
}

const notFoundTeacher = {
  error: "not_found",
  message: "Profil guru untuk akun ini tidak ditemukan. Hubungi Admin sekolah.",
  statusCode: 404,
} as const;

/** Item template jurnal AKTIF milik sekolah guru, terurut. */
async function listActiveTemplateItems(db: Database, schoolId: string) {
  return db
    .select({
      id: journalTemplateItems.id,
      itemName: journalTemplateItems.itemName,
      itemType: journalTemplateItems.itemType,
      orderIndex: journalTemplateItems.orderIndex,
    })
    .from(journalTemplateItems)
    .innerJoin(
      journalTemplates,
      eq(journalTemplateItems.journalTemplateId, journalTemplates.id)
    )
    .where(and(eq(journalTemplates.schoolId, schoolId), eq(journalTemplates.isActive, true)))
    .orderBy(asc(journalTemplateItems.orderIndex));
}

const dateQuerySchema = z.object({ date: z.string().date() });

/**
 * GET /evidence-requirements?date=YYYY-MM-DD
 * Pilihan guru untuk tanggal tsb (atau null) + daftar item template aktif
 * sebagai pilihan. Satu endpoint untuk satu layar UI.
 */
evidenceRequirementsRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  zValidator("query", dateQuerySchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { date } = c.req.valid("query");

    const teacher = await findOwnTeacher(db, user.sub);
    if (!teacher) return c.json(notFoundTeacher, 404);

    const items = await listActiveTemplateItems(db, teacher.schoolId);

    const [requirement] = await db
      .select({
        id: evidenceRequirements.id,
        requirementDate: evidenceRequirements.requirementDate,
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
          eq(evidenceRequirements.requirementDate, date)
        )
      );

    return c.json({ data: { requirement: requirement ?? null, templateItems: items } });
  }
);

const upsertSchema = z.object({
  date: z.string().date(),
  templateItemId: z.string().uuid(),
});

/**
 * PUT /evidence-requirements - tetapkan/ganti kebiasaan wajib berbukti
 * untuk satu tanggal. UPSERT pada unique (teacher_id, requirement_date).
 */
evidenceRequirementsRoute.put(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  zValidator("json", upsertSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { date, templateItemId } = c.req.valid("json");

    const teacher = await findOwnTeacher(db, user.sub);
    if (!teacher) return c.json(notFoundTeacher, 404);

    // Item yang dipilih HARUS milik template aktif sekolah guru - mencegah
    // guru menunjuk item template sekolah lain / template nonaktif.
    const items = await listActiveTemplateItems(db, teacher.schoolId);
    const chosen = items.find((i) => i.id === templateItemId);
    if (!chosen) {
      return c.json(
        {
          error: "invalid_template_item",
          message: "Item tidak ditemukan pada template jurnal aktif sekolah Anda.",
          statusCode: 422,
        },
        422
      );
    }

    const [saved] = await db
      .insert(evidenceRequirements)
      .values({ teacherId: teacher.id, requirementDate: date, templateItemId })
      .onConflictDoUpdate({
        target: [evidenceRequirements.teacherId, evidenceRequirements.requirementDate],
        set: { templateItemId },
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "update",
      tableName: "evidence_requirements",
      recordId: saved.id,
      newValue: { requirementDate: date, templateItemId, itemName: chosen.itemName },
    });

    return c.json({ data: { ...saved, itemName: chosen.itemName } });
  }
);

/**
 * DELETE /evidence-requirements?date=YYYY-MM-DD - hapus pilihan untuk satu
 * tanggal. Setelah dihapus, berlaku fallback: siswa wajib melampirkan
 * minimal satu foto pada kebiasaan mana pun.
 */
evidenceRequirementsRoute.delete(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  zValidator("query", dateQuerySchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const { date } = c.req.valid("query");

    const teacher = await findOwnTeacher(db, user.sub);
    if (!teacher) return c.json(notFoundTeacher, 404);

    const deleted = await db
      .delete(evidenceRequirements)
      .where(
        and(
          eq(evidenceRequirements.teacherId, teacher.id),
          eq(evidenceRequirements.requirementDate, date)
        )
      )
      .returning();

    if (deleted.length > 0) {
      await db.insert(auditLogs).values({
        userId: user.sub,
        action: "delete",
        tableName: "evidence_requirements",
        recordId: deleted[0].id,
        oldValue: { requirementDate: date, templateItemId: deleted[0].templateItemId },
      });
    }

    return c.json({ data: { deleted: deleted.length > 0 } });
  }
);
