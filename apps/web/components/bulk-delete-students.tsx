"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  bulkDeleteStudents,
  type BulkDeleteResult,
} from "@/app/dashboard/admin/siswa/hapus-massal/actions";

/**
 * Hapus massal peserta didik berdasarkan NISN dari file Excel.
 * Parsing dilakukan di browser (pola sama dengan bulk-import-students.tsx,
 * lihat docs/bulk-import-export.md). Hanya kolom `nisn` yang dibaca —
 * kolom lain diabaikan, sehingga file hasil "Export Excel" bisa langsung
 * dipakai setelah baris siswa yang TIDAK ingin dihapus dibuang.
 *
 * Sengaja tidak mendukung penghapusan berdasarkan nama: nama tidak unik
 * dan rawan salah ketik; NISN adalah kunci unik nasional.
 */
const NISN_RE = /^\d{5,30}$/;

export function BulkDeleteStudents() {
  const [nisns, setNisns] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<BulkDeleteResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResults(null);
    setParseError(null);
    setNisns([]);
    setSkipped([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: "",
        });

        // Excel sering membaca NISN sebagai angka - normalisasi ke string.
        const values = raw.map((r) => String(r.nisn ?? "").trim());

        if (values.length === 0 || values.every((v) => v === "")) {
          setParseError(
            'Kolom "nisn" tidak ditemukan atau kosong. Baris pertama harus berisi header bernama persis: nisn.'
          );
          return;
        }

        const valid: string[] = [];
        const bad: string[] = [];
        const seen = new Set<string>();
        for (const v of values) {
          if (v === "") continue;
          if (!NISN_RE.test(v)) {
            bad.push(v);
          } else if (!seen.has(v)) {
            seen.add(v);
            valid.push(v);
          }
        }

        if (valid.length === 0) {
          setParseError("Tidak ada NISN valid (5-30 digit angka) yang terbaca dari file.");
          return;
        }

        setNisns(valid);
        setSkipped(bad);
      } catch {
        setParseError("Gagal membaca file. Pastikan format .xlsx valid.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleSubmit() {
    if (
      !window.confirm(
        `HAPUS ${nisns.length} peserta didik beserta akun login mereka? ` +
          `Tindakan ini tidak bisa dibatalkan. Siswa yang sudah punya jurnal akan otomatis dilewati.`
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const result = await bulkDeleteStudents(nisns);
      setResults(result);
    } finally {
      setSubmitting(false);
    }
  }

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results ? results.length - successCount : 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">File Excel (.xlsx)</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/80"
        />
        {fileName && <p className="mt-1 text-xs text-slate-500">Dipilih: {fileName}</p>}
        {parseError && <p className="mt-1 text-xs text-red-600">{parseError}</p>}
        {skipped.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">
            {skipped.length} nilai dilewati karena bukan NISN valid:{" "}
            {skipped.slice(0, 5).join(", ")}
            {skipped.length > 5 ? ", ..." : ""}
          </p>
        )}
      </div>

      {nisns.length > 0 && !results && (
        <>
          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">NISN yang akan dihapus</th>
                </tr>
              </thead>
              <tbody>
                {nisns.slice(0, 20).map((n, i) => (
                  <tr key={n} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5">{i + 1}</td>
                    <td className="px-2 py-1.5">{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Total {nisns.length} NISN unik terbaca
            {nisns.length > 20 ? " (preview 20 pertama)" : ""}.
          </p>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-fit rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
          >
            {submitting ? "Menghapus..." : `Hapus ${nisns.length} Peserta Didik`}
          </button>
        </>
      )}

      {results && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-2 text-sm font-medium">
            Selesai: {successCount} terhapus, {failCount} gagal/dilewati.
          </p>
          {successCount > 0 && (
            <ul className="mb-2 max-h-40 overflow-auto text-xs text-emerald-700 dark:text-emerald-400">
              {results
                .filter((r) => r.success)
                .map((r) => (
                  <li key={r.row}>
                    {r.nisn} — {r.message} terhapus
                  </li>
                ))}
            </ul>
          )}
          {failCount > 0 && (
            <ul className="max-h-40 overflow-auto text-xs text-red-600">
              {results
                .filter((r) => !r.success)
                .map((r) => (
                  <li key={r.row}>
                    Baris {r.row} ({r.nisn}): {r.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
