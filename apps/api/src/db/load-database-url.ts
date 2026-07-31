import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Mencari DATABASE_URL untuk skrip Node (migrate.ts, backfill-*.ts).
 * TIDAK dipakai oleh Worker - di Cloudflare, koneksi datang dari binding env.
 *
 * Urutan pencarian:
 * 1. Environment variable (dipakai CI/GitHub Actions), atau
 * 2. File apps/api/.dev.vars / apps/web/.env.local (pengembangan lokal) -
 *    dibaca otomatis supaya perintahnya sama di Windows cmd, PowerShell,
 *    maupun bash tanpa perlu set variabel manual.
 *
 * Skrip diasumsikan dijalankan dari root repo (lewat npm run ...).
 */
export function loadDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

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

/** Seperti loadDatabaseUrl, tetapi melempar error dengan petunjuk perbaikan. */
export function requireDatabaseUrl(): string {
  const url = loadDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL tidak ditemukan. Isi apps/api/.dev.vars (lihat docs/setup-lokal.md) " +
        "atau set environment variable DATABASE_URL sebelum menjalankan skrip ini."
    );
  }
  return url;
}
