import { Hono } from "hono";
import { sql } from "drizzle-orm";
import type { Env, Variables } from "../index";

export const healthRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Endpoint kesehatan sistem - dipakai oleh:
 * 1. Uptime monitor eksternal (mis. UptimeRobot) untuk memastikan Workers hidup.
 * 2. Pengecekan cepat konektivitas ke Neon setelah deploy.
 * Tidak memerlukan autentikasi karena tidak membocorkan data sensitif.
 */
healthRoute.get("/", async (c) => {
  try {
    const db = c.get("db");
    await db.execute(sql`select 1`);
    return c.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json(
      { status: "error", database: "disconnected", message: (err as Error).message },
      503
    );
  }
});
