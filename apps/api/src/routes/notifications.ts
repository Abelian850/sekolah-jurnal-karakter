import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { notifications } from "../db/schema";
import type { Env, Variables } from "../index";

export const notificationsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Notifikasi in-app (Fase 6). Semua endpoint hanya menyentuh notifikasi
 * milik user yang sedang login (users.id dari JWT) - tidak ada permission
 * khusus karena SEMUA role bisa menerima notifikasi, dan tidak ada cara
 * membaca notifikasi milik user lain dari endpoint ini.
 */

/** GET /notifications - 50 notifikasi terbaru milik sendiri. */
notificationsRoute.get("/", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const result = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.sub))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return c.json({ data: result });
});

/** GET /notifications/unread-count - jumlah belum dibaca (untuk badge nav). */
notificationsRoute.get("/unread-count", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.sub), eq(notifications.isRead, false)));

  return c.json({ data: { count: row?.count ?? 0 } });
});

/** PATCH /notifications/read-all - tandai semua terbaca. */
notificationsRoute.patch("/read-all", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.sub), eq(notifications.isRead, false)));

  return c.json({ data: { ok: true } });
});

/** PATCH /notifications/:id/read - tandai satu terbaca. */
notificationsRoute.patch("/:id/read", authMiddleware, async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const id = c.req.param("id");

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.sub)))
    .returning();

  if (!updated) {
    return c.json(
      { error: "not_found", message: "Notifikasi tidak ditemukan", statusCode: 404 },
      404
    );
  }

  return c.json({ data: updated });
});
