import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc, sql } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { journalTemplates, journalTemplateItems, auditLogs } from "../db/schema";
import type { Env, Variables } from "../index";

export const journalTemplatesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Modul Admin untuk template jurnal harian (Fase 5).
 * Pola mengikuti schools.ts (CRUD dasar), semesters.ts (activate:
 * nonaktifkan yang lama lalu aktifkan yang baru - dua statement berurutan,
 * Neon HTTP driver tidak mendukung transaksi interaktif), dan teachers.ts
 * (kompensasi manual saat insert bertingkat gagal di langkah kedua).
 */

// Kolom item_type di DB adalah varchar bebas; zod-lah yang membatasi
// nilai valid agar frontend cukup menangani 4 tipe ini.
const itemTypeSchema = z.enum(["checklist", "waktu", "catatan", "foto"]);

const createTemplateSchema = z.object({
  schoolId: z.string().uuid(),
  name: z.string().min(3).max(255),
  items: z
    .array(
      z.object({
        itemName: z.string().min(1).max(255),
        itemType: itemTypeSchema,
      })
    )
    .min(1)
    .max(100),
});

/**
 * Deteksi pelanggaran FK RESTRICT dari Postgres (code 23503), misalnya
 * menghapus template/item yang sudah direferensikan oleh jurnal siswa.
 */
function isFkViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23503"
  );
}

journalTemplatesRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  async (c) => {
    const db = c.get("db");
    const schoolId = c.req.query("schoolId");

    const result = schoolId
      ? await db.select().from(journalTemplates).where(eq(journalTemplates.schoolId, schoolId))
      : await db.select().from(journalTemplates);

    return c.json({ data: result });
  }
);

journalTemplatesRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  zValidator("json", createTemplateSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const body = c.req.valid("json");

    const [template] = await db
      .insert(journalTemplates)
      .values({ schoolId: body.schoolId, name: body.name, isActive: false })
      .returning();

    try {
      for (let i = 0; i < body.items.length; i++) {
        await db.insert(journalTemplateItems).values({
          journalTemplateId: template.id,
          itemName: body.items[i].itemName,
          itemType: body.items[i].itemType,
          orderIndex: i,
        });
      }
    } catch (err) {
      // Kompensasi manual: hapus template yang terlanjur dibuat
      // (item yang sudah masuk ikut terhapus lewat ON DELETE CASCADE).
      await db.delete(journalTemplates).where(eq(journalTemplates.id, template.id));
      throw err;
    }

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "create",
      tableName: "journal_templates",
      recordId: template.id,
      newValue: { ...template, items: body.items },
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: template }, 201);
  }
);

journalTemplatesRoute.get(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");

    const [template] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!template) {
      return c.json(
        { error: "not_found", message: "Template jurnal tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const items = await db
      .select()
      .from(journalTemplateItems)
      .where(eq(journalTemplateItems.journalTemplateId, id))
      .orderBy(asc(journalTemplateItems.orderIndex));

    return c.json({ data: { ...template, items } });
  }
);

const renameSchema = z.object({ name: z.string().min(3).max(255) });

journalTemplatesRoute.patch(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  zValidator("json", renameSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const { name } = c.req.valid("json");

    const [existing] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!existing) {
      return c.json(
        { error: "not_found", message: "Template jurnal tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const [updated] = await db
      .update(journalTemplates)
      .set({ name })
      .where(eq(journalTemplates.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "update",
      tableName: "journal_templates",
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: updated });
  }
);

// Pola activate identik dengan semesters.ts/academic-years.ts, di-scope
// per sekolah: hanya satu template aktif per sekolah pada satu waktu.
journalTemplatesRoute.patch(
  "/:id/activate",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const [target] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!target) {
      return c.json(
        { error: "not_found", message: "Template jurnal tidak ditemukan", statusCode: 404 },
        404
      );
    }

    await db
      .update(journalTemplates)
      .set({ isActive: false })
      .where(
        and(eq(journalTemplates.schoolId, target.schoolId), eq(journalTemplates.isActive, true))
      );

    const [activated] = await db
      .update(journalTemplates)
      .set({ isActive: true })
      .where(eq(journalTemplates.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "update",
      tableName: "journal_templates",
      recordId: id,
      oldValue: target,
      newValue: activated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: activated });
  }
);

const addItemSchema = z.object({
  itemName: z.string().min(1).max(255),
  itemType: itemTypeSchema,
});

journalTemplatesRoute.post(
  "/:id/items",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  zValidator("json", addItemSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [template] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!template) {
      return c.json(
        { error: "not_found", message: "Template jurnal tidak ditemukan", statusCode: 404 },
        404
      );
    }

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number | null>`max(${journalTemplateItems.orderIndex})` })
      .from(journalTemplateItems)
      .where(eq(journalTemplateItems.journalTemplateId, id));

    const [created] = await db
      .insert(journalTemplateItems)
      .values({
        journalTemplateId: id,
        itemName: body.itemName,
        itemType: body.itemType,
        orderIndex: (maxOrder ?? -1) + 1,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "create",
      tableName: "journal_template_items",
      recordId: created.id,
      newValue: created,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: created }, 201);
  }
);

journalTemplatesRoute.delete(
  "/:id/items/:itemId",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const itemId = c.req.param("itemId");

    const [existing] = await db
      .select()
      .from(journalTemplateItems)
      .where(
        and(eq(journalTemplateItems.id, itemId), eq(journalTemplateItems.journalTemplateId, id))
      );
    if (!existing) {
      return c.json(
        { error: "not_found", message: "Item template tidak ditemukan", statusCode: 404 },
        404
      );
    }

    try {
      await db.delete(journalTemplateItems).where(eq(journalTemplateItems.id, itemId));
    } catch (err) {
      if (isFkViolation(err)) {
        return c.json(
          {
            error: "conflict",
            message:
              "Item ini sudah dipakai pada jurnal siswa sehingga tidak bisa dihapus. Nonaktifkan template dan buat template baru jika susunan item perlu diubah.",
            statusCode: 409,
          },
          409
        );
      }
      throw err;
    }

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "delete",
      tableName: "journal_template_items",
      recordId: itemId,
      oldValue: existing,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { deleted: true } });
  }
);

journalTemplatesRoute.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const [existing] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!existing) {
      return c.json(
        { error: "not_found", message: "Template jurnal tidak ditemukan", statusCode: 404 },
        404
      );
    }

    try {
      await db.delete(journalTemplates).where(eq(journalTemplates.id, id));
    } catch (err) {
      if (isFkViolation(err)) {
        return c.json(
          {
            error: "conflict",
            message:
              "Template ini sudah dipakai oleh jurnal siswa sehingga tidak bisa dihapus. Gunakan tombol nonaktifkan/aktifkan template lain sebagai gantinya.",
            statusCode: 409,
          },
          409
        );
      }
      throw err;
    }

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "delete",
      tableName: "journal_templates",
      recordId: id,
      oldValue: existing,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { deleted: true } });
  }
);
