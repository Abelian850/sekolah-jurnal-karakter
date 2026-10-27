import Link from "next/link";

/** Halaman 404 kustom (Fase 8). */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-bold tracking-tight text-brand-600">404</p>
      <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        Alamat yang Anda tuju tidak ada atau sudah dipindahkan.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500"
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
