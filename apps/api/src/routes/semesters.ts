import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { semesters, auditLogs } from "../db/schema";
import type { Env, Variables } from "../index";

export const semestersRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const createSchema = z.object({
  academicYearId: z.string().uuid(),
  name: z.enum(["Ganjil", "Genap"]),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

semestersRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  async (c) => {
    const db = c.get("db");
    const academicYearId = c.req.query("academicYearId");

    const result = academicYearId
      ? await db.select().from(semesters).where(eq(semesters.academicYearId, academicYearId))
      : await db.select().from(semesters);

    return c.json({ data: result });
  }
);

semestersRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  zValidator("json", createSchema),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const body = c.req.valid("json");

    const [created] = await db.insert(semesters).values(body).returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "create",
      tableName: "semesters",
      recordId: created.id,
      newValue: created,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: created }, 201);
  }
);

// Pola activate di bawah ini sengaja identik dengan academic-years.ts
// (nonaktifkan yang lama dalam scope yang sama, baru aktifkan yang baru)
// agar konsisten dan mudah dipelihara.
semestersRoute.patch(
  "/:id/activate",
  authMiddleware,
  requirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const id = c.req.param("id");

    const [target] = await db.select().from(semesters).where(eq(semesters.id, id));
    if (!target) {
      return c.json({ error: "not_found", message: "Semester tidak ditemukan", statusCode: 404 }, 404);
    }

    await db
      .update(semesters)
      .set({ isActive: false })
      .where(and(eq(semesters.academicYearId, target.academicYearId), eq(semesters.isActive, true)));

    const [activated] = await db
      .update(semesters)
      .set({ isActive: true })
      .where(eq(semesters.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: user.sub,
      action: "update",
      tableName: "semesters",
      recordId: id,
      oldValue: target,
      newValue: activated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: activated });
  }
);
