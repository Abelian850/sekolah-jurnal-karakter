"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  bulkImportStudents,
  type StudentImportRow,
  type BulkImportResult,
} from "@/app/dashboard/admin/siswa/impor/actions";

/**
 * Parsing file .xlsx dilakukan sepenuhnya di browser dengan SheetJS,
 * BUKAN dikirim mentah ke server untuk diproses di sana. Lihat
 * docs/bulk-import-export.md untuk alasan lengkap (backend berjalan di
 * Cloudflare Workers, yang tidak cocok untuk parsing file besar/binary
 * dengan library seperti SheetJS versi Node). Setelah di-parse, hasilnya
 * berupa array JSON biasa yang dikirim ke Server Action `bulkImportStudents`.
 *
 * Format kolom Excel yang diharapkan (baris pertama = header):
 * nis | nisn | fullName | className | gradeLevel | gender | birthDate
 * (email & password tidak ada lagi - akun dibuat otomatis, login = NISN;
 * gradeLevel opsional - jika kosong diturunkan dari kata pertama className)
 */
export function BulkImportStudents({ schools }: { schools: { id: string; name: string }[] }) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [rows, setRows] = useState<StudentImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<BulkImportResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

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
        // Excel sering membaca NIS/NISN sebagai angka - normalisasi ke string
        // agar tidak ditolak validasi backend.
        const parsed: StudentImportRow[] = raw.map((r) => ({
          nis: String(r.nis ?? "").trim(),
          nisn: String(r.nisn ?? "").trim(),
          fullName: String(r.fullName ?? "").trim(),
          className: String(r.className ?? "").trim(),
          gradeLevel: String(r.gradeLevel ?? "").trim() || undefined,
          gender: r.gender ? (String(r.gender).trim() as "L" | "P") : undefined,
          birthDate: r.birthDate ? String(r.birthDate).trim() : undefined,
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
      const result = await bulkImportStudents(schoolId, rows);
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
                  <th className="px-2 py-1.5">NIS</th>
                  <th className="px-2 py-1.5">NISN</th>
                  <th className="px-2 py-1.5">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5">{r.fullName}</td>
                    <td className="px-2 py-1.5">{r.nis}</td>
                    <td className="px-2 py-1.5">{r.nisn}</td>
                    <td className="px-2 py-1.5">{r.className}</td>
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
            {submitting ? "Mengunggah..." : `Impor ${rows.length} Peserta Didik`}
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
