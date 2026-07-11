import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { teachers, users, auditLogs } from "../db/schema";
import { createUserAccount, deleteUserAccount, getRoleId } from "../services/user-provisioning";
import type { Env, Variables } from "../index";

export const teachersRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

const createTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  schoolId: z.string().uuid(),
  nip: z.string().max(30).optional(),
  fullName: z.string().min(3).max(255),
  phone: z.string().max(30).optional(),
  isGuruWali: z.boolean().default(false),
});

teachersRoute.get(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  async (c) => {
    const db = c.get("db");
    const schoolId = c.req.query("schoolId");

    const result = schoolId
      ? await db.select().from(teachers).where(eq(teachers.schoolId, schoolId))
      : await db.select().from(teachers);

    return c.json({ data: result });
  }
);

teachersRoute.post(
  "/",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  zValidator("json", createTeacherSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const body = c.req.valid("json");

    // Role login mengikuti status wali: guru wali harus punya role
    // `guru_wali` agar diarahkan ke /dashboard/guru-wali dan mendapat
    // permission JOURNAL_VERIFY (lihat ROLE_PERMISSIONS di packages/shared).
    const user = await createUserAccount(db, {
      email: body.email,
      plainPassword: body.password,
      roleName: body.isGuruWali ? "guru_wali" : "guru",
    });

    try {
      const [teacher] = await db
        .insert(teachers)
        .values({
          userId: user.id,
          schoolId: body.schoolId,
          nip: body.nip,
          fullName: body.fullName,
          phone: body.phone,
          isGuruWali: body.isGuruWali,
        })
        .returning();

      await db.insert(auditLogs).values({
        userId: admin.sub,
        action: "create",
        tableName: "teachers",
        recordId: teacher.id,
        newValue: teacher,
        ipAddress: c.req.header("cf-connecting-ip") ?? null,
      });

      return c.json({ data: teacher }, 201);
    } catch (err) {
      // Kompensasi manual: hapus user yang sudah terlanjur dibuat jika
      // insert profil teacher gagal (lihat catatan di user-provisioning.ts).
      await deleteUserAccount(db, user.id);
      throw err;
    }
  }
);

const bulkTeacherSchema = z.object({
  schoolId: z.string().uuid(),
  rows: z
    .array(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        nip: z.string().max(30).optional(),
        fullName: z.string().min(3).max(255),
        phone: z.string().max(30).optional(),
        isGuruWali: z.boolean().default(false),
      })
    )
    .min(1)
    .max(500),
});

/**
 * POST /teachers/bulk
 * Menerima array baris hasil parsing Excel dari frontend (lihat
 * apps/web/components/bulk-import-teachers.tsx yang mem-parsing file .xlsx
 * di browser dengan SheetJS, BUKAN di server - lihat catatan trade-off di
 * docs/bulk-import-export.md). Setiap baris diproses independen; baris yang
 * gagal tidak menggagalkan baris lain (bukan all-or-nothing), sesuai
 * batasan transaksi Neon HTTP driver yang sudah dijelaskan di
 * user-provisioning.ts. Ringkasan sukses/gagal dikembalikan per baris.
 */
teachersRoute.post(
  "/bulk",
  authMiddleware,
  requirePermission(PERMISSIONS.BULK_IMPORT_EXPORT),
  zValidator("json", bulkTeacherSchema),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const { schoolId, rows } = c.req.valid("json");

    const results: Array<{ row: number; success: boolean; message?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const user = await createUserAccount(db, {
          email: row.email,
          plainPassword: row.password,
          roleName: row.isGuruWali ? "guru_wali" : "guru",
        });

        const [teacher] = await db
          .insert(teachers)
          .values({
            userId: user.id,
            schoolId,
            nip: row.nip,
            fullName: row.fullName,
            phone: row.phone,
            isGuruWali: row.isGuruWali,
          })
          .returning();

        await db.insert(auditLogs).values({
          userId: admin.sub,
          action: "create",
          tableName: "teachers",
          recordId: teacher.id,
          newValue: teacher,
          ipAddress: c.req.header("cf-connecting-ip") ?? null,
        });

        results.push({ row: i + 1, success: true });
      } catch (err) {
        results.push({ row: i + 1, success: false, message: (err as Error).message });
      }
    }

    return c.json({ data: results });
  }
);

teachersRoute.patch(
  "/:id/toggle-wali",
  authMiddleware,
  requirePermission(PERMISSIONS.TEACHER_MANAGE),
  async (c) => {
    const db = c.get("db");
    const admin = c.get("user");
    const id = c.req.param("id");

    const [existing] = await db.select().from(teachers).where(eq(teachers.id, id));
    if (!existing) {
      return c.json({ error: "not_found", message: "Guru tidak ditemukan", statusCode: 404 }, 404);
    }

    const [updated] = await db
      .update(teachers)
      .set({ isGuruWali: !existing.isGuruWali })
      .where(eq(teachers.id, id))
      .returning();

    // Sinkronkan role login dengan status wali yang baru. Perubahan role
    // baru berlaku saat guru tersebut login ulang (role tersimpan di JWT).
    const newRoleId = await getRoleId(db, updated.isGuruWali ? "guru_wali" : "guru");
    await db.update(users).set({ roleId: newRoleId }).where(eq(users.id, existing.userId));

    await db.insert(auditLogs).values({
      userId: admin.sub,
      action: "update",
      tableName: "teachers",
      recordId: id,
      oldValue: existing,
      newValue: updated,
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: updated });
  }
);
