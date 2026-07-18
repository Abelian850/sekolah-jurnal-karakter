import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { createDb, type Database } from "./db/client";
import { healthRoute } from "./routes/health";
import { schoolsRoute } from "./routes/schools";
import { meRoute } from "./routes/me";
import { academicYearsRoute } from "./routes/academic-years";
import { semestersRoute } from "./routes/semesters";
import { teachersRoute } from "./routes/teachers";
import { studentsRoute } from "./routes/students";
import { parentsRoute } from "./routes/parents";
import { teacherStudentRoute } from "./routes/teacher-student";
import { journalTemplatesRoute } from "./routes/journal-templates";
import { journalsRoute } from "./routes/journals";
import { verificationsRoute } from "./routes/verifications";
import { notificationsRoute } from "./routes/notifications";
import { evidenceRequirementsRoute } from "./routes/evidence-requirements";
import { principalsRoute } from "./routes/principals";
import { analyticsRoute } from "./routes/analytics";
import { childrenRoute } from "./routes/children";
import { filesRoute } from "./routes/files";
import type { AppJwtPayload } from "@sjk/shared";

/**
 * Bindings tersedia dari Cloudflare (env vars, secrets, R2 bucket).
 * Diisi lewat `wrangler secret put <NAMA>` untuk data sensitif,
 * dan lewat wrangler.toml [vars] untuk yang tidak sensitif.
 * Lihat docs/environment-variables.md untuk daftar lengkap & cara set.
 */
export type Env = {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  FRONTEND_ORIGIN: string;
  JOURNAL_BUCKET: R2Bucket;
};

/**
 * Variables yang di-set oleh middleware dan dipakai lintas route
 * (db connection per-request, user hasil verifikasi JWT).
 */
export type Variables = {
  db: Database;
  user: AppJwtPayload;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ---------- Global middleware ----------
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", async (c, next) => {
  const corsMiddleware = cors({
    // Fail-closed (review Fase 9): jika FRONTEND_ORIGIN lupa di-set, string
    // kosong tidak akan pernah cocok dengan Origin mana pun — lebih aman
    // daripada default hono/cors yang terbuka ("*").
    origin: c.env.FRONTEND_ORIGIN || "",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  return corsMiddleware(c, next);
});

// Membuat koneksi database per-request (bukan top-level) agar cocok
// dengan model eksekusi isolate Cloudflare Workers.
app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DATABASE_URL));
  await next();
});

// ---------- Routes ----------
app.route("/health", healthRoute);
app.route("/me", meRoute);
app.route("/schools", schoolsRoute);
app.route("/academic-years", academicYearsRoute);
app.route("/semesters", semestersRoute);
app.route("/teachers", teachersRoute);
app.route("/students", studentsRoute);
app.route("/parents", parentsRoute);
app.route("/teacher-student", teacherStudentRoute);
app.route("/journal-templates", journalTemplatesRoute);
app.route("/journals", journalsRoute);
app.route("/verifications", verificationsRoute);
app.route("/notifications", notificationsRoute);
app.route("/evidence-requirements", evidenceRequirementsRoute);
app.route("/principals", principalsRoute);
app.route("/analytics", analyticsRoute);
app.route("/children", childrenRoute);
app.route("/files", filesRoute);

// ---------- Error handler global ----------
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    { error: "internal_server_error", message: "Terjadi kesalahan pada server", statusCode: 500 },
    500
  );
});

app.notFound((c) =>
  c.json({ error: "not_found", message: "Endpoint tidak ditemukan", statusCode: 404 }, 404)
);

export default app;
