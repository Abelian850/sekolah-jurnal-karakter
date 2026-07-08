import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

/**
 * Menjalankan migrasi Drizzle ke Neon. Dipanggil lewat:
 *   npm run db:migrate
 * atau otomatis oleh GitHub Actions (lihat .github/workflows/deploy-api.yml)
 * setiap kali ada push ke branch main.
 *
 * DATABASE_URL dicari berurutan dari:
 * 1. Environment variable (dipakai CI/GitHub Actions), atau
 * 2. File apps/api/.dev.vars / apps/web/.env.local (pengembangan lokal) -
 *    dibaca otomatis supaya perintahnya sama di Windows cmd, PowerShell,
 *    maupun bash tanpa perlu set variabel manual.
 */
function loadDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Skrip diasumsikan dijalankan dari root repo (npm run db:migrate),
  // sama seperti asumsi `migrationsFolder: "./drizzle"` di bawah.
  const candidates = [
    resolve(process.cwd(), "apps/api/.dev.vars"),
    resolve(process.cwd(), "apps/web/.env.local"),
    resolve(process.cwd(), ".dev.vars"),
  ];

  for (const file of candidates) {
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (match) {
        // Buang tanda kutip pembungkus jika ada.
        const value = match[1].replace(/^["']|["']$/g, "").trim();
        if (value) {
          console.log(`DATABASE_URL dibaca dari ${file}`);
          return value;
        }
      }
    }
  }

  return undefined;
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL tidak ditemukan. Isi apps/api/.dev.vars (lihat docs/setup-lokal.md) " +
        "atau set environment variable DATABASE_URL sebelum menjalankan migrasi."
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
