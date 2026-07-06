import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Membuat koneksi Drizzle ke Neon menggunakan driver HTTP serverless.
 * Driver ini WAJIB dipakai (bukan driver TCP biasa) karena Cloudflare Workers
 * tidak mendukung koneksi TCP long-lived. Setiap query dikirim sebagai HTTP
 * request tunggal ke endpoint Neon, cocok dengan model edge/serverless.
 *
 * Dipanggil per-request di dalam handler Hono (lihat src/index.ts),
 * BUKAN sekali di top-level module, agar env binding Cloudflare (c.env)
 * bisa dipakai dengan benar di setiap invocation.
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type Database = ReturnType<typeof createDb>;
