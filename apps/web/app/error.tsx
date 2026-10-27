"use client";

/**
 * Error boundary global (Fase 8) — menangkap error render/route agar
 * pengguna tidak melihat layar kosong; tombol "Coba lagi" memanggil reset().
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
        Maaf, ada masalah saat memuat halaman ini. Silakan coba lagi; jika
        berulang, hubungi Admin sekolah.
        {error.digest ? ` (Kode: ${error.digest})` : null}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500"
      >
        Coba lagi
      </button>
    </main>
  );
}
