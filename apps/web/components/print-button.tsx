"use client";

/**
 * Tombol cetak/simpan PDF via dialog print browser (window.print).
 * Dipakai halaman laporan per-siswa Guru Wali — PDF digenerate DI BROWSER,
 * bukan di Workers (limit CPU free tier, lihat docs/bulk-import-export.md).
 */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 print:hidden"
    >
      Cetak / Simpan PDF
    </button>
  );
}
