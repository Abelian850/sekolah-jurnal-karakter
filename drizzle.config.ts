import { defineConfig } from "drizzle-kit";

// Konfigurasi drizzle-kit untuk generate & migrate skema database Neon PostgreSQL.
// DATABASE_URL diambil dari environment variable, JANGAN pernah di-hardcode.
export default defineConfig({
  schema: "./apps/api/src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  strict: true,
  verbose: true,
});
