import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, asc, sql } from "drizzle-orm";
import { PERMISSIONS, FIXED_JOURNAL_ITEM_NAMES } from "@sjk/shared";
import type { AppJwtPayload } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { journalTemplates, journalTemplateItems, auditLogs } from "../db/schema";
import type { Env, Variables } from "../index";

export const journalTemplatesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Modul template jurnal harian (Fase 5, revisi Juli 2026).
 * Pola mengikuti schools.ts (CRUD dasar), semesters.ts (activate:
 * nonaktifkan yang lama lalu aktifkan yang baru - dua statement berurutan,
 * Neon HTTP driver tidak mendukung transaksi interaktif), dan teachers.ts
 * (kompensasi manual saat insert bertingkat gagal di langkah kedua).
 *
 * REVISI JULI 2026:
 * - Tidak lagi khusus Admin: Guru Wali juga punya JOURNAL_TEMPLATE_MANAGE,
 *   tapi HANYA untuk sekolahnya sendiri. Scope diturunkan dari schoolId di
 *   JWT (lihat scopedSchoolId) - Admin (schoolId null di JWT) tetap lintas
 *   sekolah.
 * - Setiap template WAJIB memuat 7 item tetap (FIXED_JOURNAL_ITEMS di
 *   packages/shared) - divalidasi saat create; item tetap tidak boleh
 *   dihapus dari template.
 * - Item punya `description` (keterangan contoh untuk siswa) dan
 *   `requiresPhoto` (default butuh bukti foto; Bukti Harian per-tanggal
 *   tetap menang - lihat routes/journals.ts).
 */

// Kolom item_type di DB adalah varchar bebas; zod-lah yang membatasi
// nilai valid agar frontend cukup menangani 4 tipe ini.
const itemTypeSchema = z.enum(["checklist", "waktu", "catatan", "foto"]);

const itemSchema = z.object({
  itemName: z.string().min(1).max(255),
  itemType: itemTypeSchema,
  description: z.string().max(500).optional(),
  requiresPhoto: z.boolean().default(false),
});

const createTemplateSchema = z
  .object({
    // Opsional untuk Guru Wali (dipaksa ke sekolahnya sendiri); wajib
    // secara efektif untuk Admin (divalidasi manual di handler).
    schoolId: z.string().uuid().optional(),
    name: z.string().min(3).max(255),
    items: z.array(itemSchema).min(1).max(100),
  })
  .superRefine((val, ctx) => {
    const names = new Set(val.items.map((i) => i.itemName.trim()));
    const missing = FIXED_JOURNAL_ITEM_NAMES.filter((n) => !names.has(n));
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Template wajib memuat 7 item tetap. Kurang: ${missing.join(", ")}`,
        path: ["items"],
      });
    }
  });

/**
 * schoolId efektif untuk user ini: Admin (schoolId JWT null) bebas lintas
 * sekolah -> null; role lain dikunci ke sekolahnya sendiri.
 */
function scopedSchoolId(user: AppJwtPayload): string | null {
  return user.role === "admin" ? null : user.schoolId;
}

const notFoundTemplate = {
  error: "not_found",
  message: "Template jurnal tidak ditemukan",
  statusCode: 404,
} as const;

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
    const user = c.get("user");
    // Non-admin: paksa filter ke sekolah sendiri, abaikan query schoolId.
    const schoolId = scopedSchoolId(user) ?? c.req.query("schoolId");

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

    // Guru Wali: schoolId SELALU sekolahnya sendiri; Admin wajib mengisi.
    const schoolId = scopedSchoolId(user) ?? body.schoolId;
    if (!schoolId) {
      return c.json(
        { error: "bad_request", message: "schoolId wajib diisi", statusCode: 400 },
        400
      );
    }

    const [template] = await db
      .insert(journalTemplates)
      .values({ schoolId, name: body.name, isActive: false })
      .returning();

    try {
      for (let i = 0; i < body.items.length; i++) {
        await db.insert(journalTemplateItems).values({
          journalTemplateId: template.id,
          itemName: body.items[i].itemName,
          itemType: body.items[i].itemType,
          description: body.items[i].description,
          requiresPhoto: body.items[i].requiresPhoto,
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
    const user = c.get("user");
    const id = c.req.param("id");

    const [template] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!template) return c.json(notFoundTemplate, 404);
    const scope = scopedSchoolId(user);
    if (scope && template.schoolId !== scope) return c.json(notFoundTemplate, 404);

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
    if (!existing) return c.json(notFoundTemplate, 404);
    const scope = scopedSchoolId(user);
    if (scope && existing.schoolId !== scope) return c.json(notFoundTemplate, 404);

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
    if (!target) return c.json(notFoundTemplate, 404);
    const scope = scopedSchoolId(user);
    if (scope && target.schoolId !== scope) return c.json(notFoundTemplate, 404);

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

journalTemplatesRoute.post(
  "/:id/items",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  zValidator("json", itemSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const [template] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!template) return c.json(notFoundTemplate, 404);
    const scope = scopedSchoolId(user);
    if (scope && template.schoolId !== scope) return c.json(notFoundTemplate, 404);

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
        description: body.description,
        requiresPhoto: body.requiresPhoto,
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

const updateItemSchema = z
  .object({
    description: z.string().max(500).nullish(),
    requiresPhoto: z.boolean().optional(),
  })
  .refine((v) => v.description !== undefined || v.requiresPhoto !== undefined, {
    message: "Minimal satu field harus diisi",
  });

/**
 * PATCH /:id/items/:itemId - ubah keterangan contoh dan/atau penanda
 * butuh bukti foto. Nama & tipe item sengaja TIDAK bisa diubah di sini:
 * item tetap (7 kebiasaan) tidak boleh berganti nama, dan mengganti nama
 * item lain yang sudah dipakai jurnal siswa akan mengubah makna data lama.
 */
journalTemplatesRoute.patch(
  "/:id/items/:itemId",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_TEMPLATE_MANAGE),
  zValidator("json", updateItemSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");
    const itemId = c.req.param("itemId");
    const body = c.req.valid("json");

    const [template] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!template) return c.json(notFoundTemplate, 404);
    const scope = scopedSchoolId(user);
    if (scope && template.schoolId !== scope) return c.json(notFoundTemplate, 404);

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

    const [updated] = await db
      .update(journalTemplateItems)
      .set({
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.requiresPhoto !== undefined ? { requiresPhoto: body.requiresPhoto } : {}),
      })
      .where(eq(journalTemplateItems.id, itemId))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "update",
      tableName: "journal_template_items",
      recordId: itemId,
      oldValue: existing,
      newValue: updated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: updated });
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

    const [template] = await db.select().from(journalTemplates).where(eq(journalTemplates.id, id));
    if (!template) return c.json(notFoundTemplate, 404);
    const scope = scopedSchoolId(user);
    if (scope && template.schoolId !== scope) return c.json(notFoundTemplate, 404);

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

    // 7 item tetap tidak boleh dihapus (revisi Juli 2026).
    if (FIXED_JOURNAL_ITEM_NAMES.includes(existing.itemName)) {
      return c.json(
        {
          error: "conflict",
          message: `"${existing.itemName}" adalah salah satu dari 7 kebiasaan tetap dan tidak bisa dihapus dari template.`,
          statusCode: 409,
        },
        409
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
    if (!existing) return c.json(notFoundTemplate, 404);
    const scope = scopedSchoolId(user);
    if (scope && existing.schoolId !== scope) return c.json(notFoundTemplate, 404);

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
