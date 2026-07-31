import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { requireDatabaseUrl } from "./load-database-url";

/**
 * Menjalankan migrasi Drizzle ke Neon. Dipanggil lewat:
 *   npm run db:migrate
 * atau otomatis oleh GitHub Actions (lihat .github/workflows/deploy-api.yml)
 * setiap kali ada push ke branch main.
 *
 * Pencarian DATABASE_URL ada di ./load-database-url.ts (dipakai bersama
 * skrip pemeliharaan lain, mis. backfill-character-score.ts).
 */
async function main() {
  const databaseUrl = requireDatabaseUrl();

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log("Menjalankan migrasi ke Neon...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrasi selesai.");
}

main().catch((err) => {
  console.error("Migrasi gagal:", err);
  process.exit(1);
});
