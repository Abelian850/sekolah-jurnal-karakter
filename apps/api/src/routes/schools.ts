import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { schools, auditLogs } from "../db/schema";
import type { Env, Variables } from "../index";

export const schoolsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchoolSchema = z.object({
  name: z.string().min(3).max(255),
  npsn: z.string().max(20).optional(),
  address: z.string().optional(),
});

/**
 * GET /schools - daftar sekolah. Hanya Admin (permission SCHOOL_MANAGE).
 * Modul ini adalah CONTOH POLA lengkap: autentikasi -> RBAC -> query ->
 * response terstruktur. Modul lain di Fase 3+ mengikuti pola yang sama.
 */
schoolsRoute.get("/", authMiddleware, requirePermission(PERMISSIONS.SCHOOL_MANAGE), async (c) => {
  const db = c.get("db");
  const result = await db.select().from(schools);
  return c.json({ data: result });
});

schoolsRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.SCHOOL_MANAGE),
  zValidator("json", createSchoolSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const body = c.req.valid("json");

    const [created] = await db.insert(schools).values(body).returning();

    // Audit log wajib untuk setiap mutasi data sensitif (Fase 1 Bab 7).
    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "create",
      tableName: "schools",
      recordId: created.id,
      newValue: created,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: created }, 201);
  }
);

schoolsRoute.get(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.SCHOOL_MANAGE),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const [result] = await db.select().from(schools).where(eq(schools.id, id));

    if (!result) {
      return c.json({ error: "not_found", message: "Sekolah tidak ditemukan", statusCode: 404 }, 404);
    }
    return c.json({ data: result });
  }
);
