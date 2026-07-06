import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { academicYears, auditLogs } from "../db/schema";
import type { Env, Variables } from "../index";

export const academicYearsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  schoolId: z.string().uuid(),
  year: z.string().min(4).max(20), // contoh: "2026/2027"
});

academicYearsRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  async (c) => {
    const db = c.get("db");
    const schoolId = c.req.query("schoolId");

    const result = schoolId
      ? await db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId))
      : await db.select().from(academicYears);

    return c.json({ data: result });
  }
);

academicYearsRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  zValidator("json", createSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const body = c.req.valid("json");

    const [created] = await db.insert(academicYears).values(body).returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "create",
      tableName: "academic_years",
      recordId: created.id,
      newValue: created,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: created }, 201);
  }
);

/**
 * PATCH /academic-years/:id/activate
 * Mengaktifkan satu tahun ajaran dan MENONAKTIFKAN semua tahun ajaran lain
 * di sekolah yang sama, dalam satu transaksi implisit (dua statement
 * berurutan - Neon HTTP driver tidak mendukung transaksi multi-statement
 * interaktif, sehingga urutan operasi disusun agar aman jika gagal di
 * tengah: nonaktifkan dulu yang lama, baru aktifkan yang baru).
 */
academicYearsRoute.patch(
  "/:id/activate",
  authMiddleware,
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const [target] = await db.select().from(academicYears).where(eq(academicYears.id, id));
    if (!target) {
      return c.json({ error: "not_found", message: "Tahun ajaran tidak ditemukan", statusCode: 404 }, 404);
    }

    await db
      .update(academicYears)
      .set({ isActive: false })
      .where(and(eq(academicYears.schoolId, target.schoolId), eq(academicYears.isActive, true)));

    const [activated] = await db
      .update(academicYears)
      .set({ isActive: true })
      .where(eq(academicYears.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "update",
      tableName: "academic_years",
      recordId: id,
      oldValue: target,
      newValue: activated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: activated });
  }
);
