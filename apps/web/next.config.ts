import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Foto disajikan dari Cloudflare R2 (bukan lewat Next Image Optimization
    // bawaan), supaya tidak perlu mengaktifkan binding Cloudflare Images
    // terpisah untuk kasus penggunaan aplikasi ini.
    unoptimized: true,
  },
};

// Diperlukan agar `next dev` bisa memakai binding Cloudflare (R2, dsb.)
// secara lokal lewat @opennextjs/cloudflare. Tidak berpengaruh saat
// production build/deploy (hanya aktif di dev server).
initOpenNextCloudflareForDev();

export default nextConfig;
