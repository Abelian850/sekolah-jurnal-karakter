import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { principals, schools, users, auditLogs } from "../db/schema";
import { createUserAccount, deleteUserAccount } from "../services/user-provisioning";
import type { Env, Variables } from "../index";

export const principalsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const createPrincipalSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  schoolId: z.string().uuid(),
  fullName: z.string().min(3).max(255),
  phone: z.string().max(30).optional(),
});

/** GET /principals - daftar kepala sekolah + nama sekolah & email akun. */
principalsRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.PRINCIPAL_MANAGE),
  async (c) => {
    const db = c.get("db");
    const result = await db
      .select({
        id: principals.id,
        fullName: principals.fullName,
        phone: principals.phone,
        schoolId: principals.schoolId,
        schoolName: schools.name,
        email: users.email,
        isActive: users.isActive,
      })
      .from(principals)
      .innerJoin(schools, eq(principals.schoolId, schools.id))
      .innerJoin(users, eq(principals.userId, users.id));
    return c.json({ data: result });
  }
);

/**
 * POST /principals - membuat akun Kepala Sekolah + profil (tautan sekolah).
 * Mengikuti pola parents/teachers: buat user dulu, rollback bila profil gagal.
 */
principalsRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.PRINCIPAL_MANAGE),
  zValidator("json", createPrincipalSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const body = c.req.valid("json");

    const [school] = await db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, body.schoolId))
      .limit(1);
    if (!school) {
      return c.json(
        { error: "school_not_found", message: "Sekolah tidak ditemukan", statusCode: 422 },
        422
      );
    }

    const user = await createUserAccount(db, {
      email: body.email,
      plainPassword: body.password,
      roleName: "kepala_sekolah",
    });

    try {
      const [principal] = await db
        .insert(principals)
        .values({
          userId: user.id,
          schoolId: body.schoolId,
          fullName: body.fullName,
          phone: body.phone,
        })
        .returning();

      await db.insert(auditLogs).values({
        userId: admin.sub,
        action: "create",
        tableName: "principals",
        recordId: principal.id,
        newValue: principal,
        ipAddress: c.req.header("cf-connecting-ip") ?? null,
      });

      return c.json({ data: principal }, 201);
    } catch (err) {
      await deleteUserAccount(db, user.id);
      throw err;
    }
  }
);

/** DELETE /principals/:id - hapus profil SEKALIGUS akun user-nya. */
principalsRoute.delete(
  "/:id",
  authMiddleware,
  requirePermission(PERMISSIONS.PRINCIPAL_MANAGE),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [principal] = await db
      .select()
      .from(principals)
      .where(eq(principals.id, id))
      .limit(1);
    if (!principal) {
      return c.json(
        { error: "not_found", message: "Kepala sekolah tidak ditemukan", statusCode: 404 },
        404
      );
    }

    // Hapus akun user; baris principals ikut terhapus via ON DELETE CASCADE.
    await deleteUserAccount(db, principal.userId);

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "delete",
      tableName: "principals",
      recordId: id,
      oldValue: principal,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { ok: true } });
  }
);
