import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * Konfigurasi build OpenNext untuk Cloudflare Workers. Cache halaman
 * (ISR/on-demand revalidation) disimpan di bucket R2 yang sama filosofinya
 * dengan JOURNAL_BUCKET di apps/api - tetap dalam Free Tier R2 (lihat
 * Fase 1 Bab 4.3). Butuh binding bernama NEXT_INC_CACHE_R2_BUCKET di
 * wrangler.toml (lihat berkas tersebut).
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
