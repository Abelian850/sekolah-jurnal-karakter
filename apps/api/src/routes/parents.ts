import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { parents, studentParent, auditLogs } from "../db/schema";
import { createUserAccount, deleteUserAccount } from "../services/user-provisioning";
import type { Env, Variables } from "../index";

export const parentsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const createParentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(3).max(255),
  phone: z.string().max(30).optional(),
  relation: z.enum(["ayah", "ibu", "wali"]),
  studentIds: z.array(z.string().uuid()).min(1),
});

parentsRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.PARENT_MANAGE),
  async (c) => {
    const db = c.get("db");
    const result = await db.select().from(parents);
    return c.json({ data: result });
  }
);

/**
 * POST /parents - membuat akun Orang Tua dan langsung menghubungkannya
 * ke satu atau lebih siswa (mis. ayah & ibu dari kakak-adik di sekolah
 * yang sama) lewat tabel relasi student_parent.
 */
parentsRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.PARENT_MANAGE),
  zValidator("json", createParentSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const body = c.req.valid("json");

    const user = await createUserAccount(db, {
      email: body.email,
      plainPassword: body.password,
      roleName: "orang_tua",
    });

    try {
      const [parent] = await db
        .insert(parents)
        .values({
          userId: user.id,
          fullName: body.fullName,
          phone: body.phone,
          relation: body.relation,
        })
        .returning();

      for (const studentId of body.studentIds) {
        await db.insert(studentParent).values({ studentId, parentId: parent.id });
      }

      await db.insert(auditLogs).values({
        userId: admin.sub,
        action: "create",
        tableName: "parents",
        recordId: parent.id,
        newValue: { ...parent, studentIds: body.studentIds },
        ipAddress: c.req.header("cf-connecting-ip") ?? null,
      });

      return c.json({ data: parent }, 201);
    } catch (err) {
      await deleteUserAccount(db, user.id);
      throw err;
    }
  }
);

parentsRoute.get(
  "/:id/students",
  authMiddleware,
  requirePermission(PERMISSIONS.PARENT_MANAGE),
  async (c) => {
    const db = c.get("db");
    const id = c.req.param("id");
    const result = await db
      .select()
      .from(studentParent)
      .where(eq(studentParent.parentId, id));
    return c.json({ data: result });
  }
);
