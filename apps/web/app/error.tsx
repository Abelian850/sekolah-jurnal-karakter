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
      <span
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ember-500/10 text-2xl font-extrabold text-ember-500"
      >
        !
      </span>
      <h1 className="text-xl font-bold text-brand-950">Terjadi kesalahan</h1>
      <p className="max-w-md text-sm text-slate-600">
        Maaf, ada masalah saat memuat halaman ini. Silakan coba lagi; jika
        berulang, hubungi Admin sekolah.
        {error.digest ? ` (Kode: ${error.digest})` : null}
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
      >
        Coba lagi
      </button>
    </main>
  );
}
