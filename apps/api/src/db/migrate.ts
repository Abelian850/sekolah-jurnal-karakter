import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

/**
 * Menjalankan migrasi Drizzle ke Neon. Dipanggil lewat:
 *   npm run db:migrate
 * atau otomatis oleh GitHub Actions (lihat .github/workflows/deploy-api.yml)
 * setiap kali ada push ke branch main.
 *
 * DATABASE_URL harus tersedia sebagai environment variable saat script ini
 * dijalankan (lokal: dari file .dev.vars atau .env; CI: dari GitHub Secrets).
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL tidak ditemukan. Set environment variable ini sebelum menjalankan migrasi."
    );
  }

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
