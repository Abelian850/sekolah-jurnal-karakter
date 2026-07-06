import Link from "next/link";

/**
 * Placeholder landing page untuk Fase 2 (memverifikasi pipeline deploy
 * berjalan end-to-end). Landing page final dengan Hero, Keunggulan, FAQ,
 * dsb. dikerjakan di Fase 8 sesuai roadmap.
 */
export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Jurnal Karakter &amp; Monitoring Peserta Didik
      </h1>
      <p className="max-w-xl text-slate-600 dark:text-slate-400">
        Fase 2: infrastruktur dasar sudah aktif — Next.js di Cloudflare Pages,
        API Hono di Cloudflare Workers, database Neon, dan autentikasi Auth.js.
      </p>
      <Link
        href="/login"
        className="glass-panel rounded-full px-6 py-3 text-sm font-medium shadow-sm transition hover:shadow-md"
      >
        Masuk ke Sistem
      </Link>
    </main>
  );
}
