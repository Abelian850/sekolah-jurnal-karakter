import { handlers } from "@/lib/auth";

// Sejak migrasi ke @opennextjs/cloudflare (lihat docs/deployment.md),
// aplikasi berjalan di runtime Node.js Workers (nodejs_compat), bukan Edge
// Runtime yang serba terbatas. Route ini sengaja TIDAK di-set
// `runtime = "edge"` lagi - runtime default (nodejs) yang dipakai, dan itu
// yang justru lebih didukung penuh oleh adapter ini.
export const { GET, POST } = handlers;
