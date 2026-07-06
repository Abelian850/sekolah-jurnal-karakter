import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import type { Env, Variables } from "../index";

export const meRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /me - mengembalikan payload identitas dari token API yang sudah
 * diverifikasi middleware. Dipakai untuk sanity-check bahwa alur
 * Auth.js -> mint token -> verifikasi Hono berjalan end-to-end, dan bisa
 * dipakai frontend untuk menampilkan info user tanpa query database lagi.
 */
meRoute.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ data: user });
});
