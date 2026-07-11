"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  bulkImportTeachers,
  type TeacherImportRow,
  type BulkImportResult,
} from "@/app/dashboard/admin/guru/impor/actions";

/**
 * Parsing file .xlsx dilakukan sepenuhnya di browser dengan SheetJS,
 * BUKAN dikirim mentah ke server (lihat docs/bulk-import-export.md dan
 * pola yang sama di bulk-import-students.tsx).
 *
 * Format kolom Excel yang diharapkan (baris pertama = header):
 * nip | fullName | email | phone | isGuruWali
 * Hanya nip & fullName wajib. Akun dibuat otomatis: login & sandi awal = NIP.
 * isGuruWali menerima: ya/tidak, true/false, 1/0 (tidak peka kapital).
 */
export function BulkImportTeachers({ schools }: { schools: { id: string; name: string }[] }) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [rows, setRows] = useState<TeacherImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<BulkImportResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  /** Unduh file template berisi header + satu baris contoh. */
  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      {
        nip: "196812251990031003",
        fullName: "Budi Santoso, S.Pd.",
        email: "budi@sekolah.sch.id",
        phone: "081234567890",
        isGuruWali: "ya",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guru");
    XLSX.writeFile(wb, "template-import-guru.xlsx");
  }

  function parseBoolean(v: unknown): boolean {
    const s = String(v ?? "").trim().toLowerCase();
    return s === "ya" || s === "true" || s === "1" || s === "y";
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResults(null);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: "",
        });
        // Excel sering membaca NIP sebagai angka - normalisasi ke string
        // agar tidak ditolak validasi backend.
        const parsed: TeacherImportRow[] = raw.map((r) => ({
          nip: String(r.nip ?? "").trim(),
          fullName: String(r.fullName ?? "").trim(),
          email: r.email ? String(r.email).trim() : undefined,
          phone: r.phone ? String(r.phone).trim() : undefined,
          isGuruWali: parseBoolean(r.isGuruWali),
        }));

        if (parsed.length === 0) {
          setParseError("File tidak berisi data. Pastikan baris pertama adalah header kolom.");
          return;
        }

        setRows(parsed);
      } catch {
        setParseError("Gagal membaca file. Pastikan format .xlsx valid.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await bulkImportTeachers(schoolId, rows);
      setResults(result);
    } finally {
      setSubmitting(false);
    }
  }

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results ? results.length - successCount : 0;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={downloadTemplate}
        className="w-fit rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Unduh Template Excel
      </button>

      <div>
        <label className="mb-1 block text-sm font-medium">Sekolah</label>
        <select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

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
      </div>

      {rows.length > 0 && !results && (
        <>
          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-2 py-1.5">Nama</th>
                  <th className="px-2 py-1.5">NIP</th>
                  <th className="px-2 py-1.5">Email</th>
                  <th className="px-2 py-1.5">Guru Wali</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5">{r.fullName}</td>
                    <td className="px-2 py-1.5">{r.nip}</td>
                    <td className="px-2 py-1.5">{r.email ?? "-"}</td>
                    <td className="px-2 py-1.5">{r.isGuruWali ? "Ya" : "Tidak"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            Total {rows.length} baris terbaca{rows.length > 20 ? " (preview 20 baris pertama)" : ""}.
          </p>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
          >
            {submitting ? "Mengunggah..." : `Impor ${rows.length} Guru`}
          </button>
        </>
      )}

      {results && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-2 text-sm font-medium">
            Selesai: {successCount} berhasil, {failCount} gagal.
          </p>
          {failCount > 0 && (
            <ul className="max-h-40 overflow-auto text-xs text-red-600">
              {results
                .filter((r) => !r.success)
                .map((r) => (
                  <li key={r.row}>
                    Baris {r.row}: {r.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
