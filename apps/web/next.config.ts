import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone dibutuhkan agar kompatibel dengan adapter
  // @cloudflare/next-on-pages saat deploy ke Cloudflare Pages.
  reactStrictMode: true,
  experimental: {
    // Diperlukan agar Auth.js (next-auth v5) berjalan di edge runtime Cloudflare.
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // Foto disajikan dari Cloudflare R2 (bukan next/image default loader),
    // supaya tidak menambah beban optimasi gambar server-side yang mahal di edge.
    unoptimized: true,
  },
};

export default nextConfig;
