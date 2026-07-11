"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  bulkAssignGuruWali,
  type BulkAssignResult,
} from "@/app/dashboard/admin/penugasan-guru-wali/actions";

interface Student {
  id: string;
  fullName: string;
  className: string;
  nisn: string | null;
}

interface Teacher {
  id: string;
  fullName: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80";

/**
 * Penugasan Guru Wali massal (revisi Juli 2026). Dua cara memilih siswa:
 * 1. Multi-select dari daftar peserta didik (dengan pencarian nama/kelas).
 * 2. Upload file Excel berkolom `nisn` ATAU tempel daftar NISN (satu per
 *    baris) - dicocokkan ke database peserta didik oleh backend.
 * Hasil dilaporkan per baris (NISN tak ditemukan / sudah punya wali tidak
 * menggagalkan baris lain). Pemindahan wali tetap lewat form tunggal.
 */
export function BulkAssignGuruWali({
  students,
  teachers,
  academicYears,
}: {
  students: Student[];
  teachers: Teacher[];
  academicYears: AcademicYear[];
}) {
  const activeYear = academicYears.find((y) => y.isActive) ?? academicYears[0];

  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(activeYear?.id ?? "");
  const [mode, setMode] = useState<"pilih" | "nisn">("pilih");

  // Mode pilih dari daftar
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Mode NISN (upload / tempel)
  const [nisnText, setNisnText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkAssignResult[] | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        (s.nisn ?? "").includes(q)
    );
  }, [students, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allIn = filtered.every((s) => next.has(s.id));
      for (const s of filtered) {
        if (allIn) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
        // Terima kolom bernama `nisn`; angka dinormalisasi ke string.
        const parsed = raw.map((r) => String(r.nisn ?? "").trim()).filter((v) => v !== "");
        if (parsed.length === 0) {
          setParseError('File tidak berisi kolom "nisn" berisi data.');
          return;
        }
        setNisnText((prev) => (prev.trim() ? prev.trim() + "\n" : "") + parsed.join("\n"));
      } catch {
        setParseError("Gagal membaca file. Pastikan format .xlsx valid.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const nisns = useMemo(
    () =>
      nisnText
        .split(/[\s,;]+/)
        .map((v) => v.trim())
        .filter((v) => v !== ""),
    [nisnText]
  );

  function handleSubmit() {
    setError(null);
    setResults(null);

    const studentIds = mode === "pilih" ? Array.from(selected) : [];
    const nisnList = mode === "nisn" ? nisns : [];
    if (studentIds.length === 0 && nisnList.length === 0) {
      setError(
        mode === "pilih"
          ? "Centang minimal satu peserta didik."
          : "Isi minimal satu NISN (upload file atau tempel daftar)."
      );
      return;
    }
    const invalid = nisnList.filter((n) => !/^\d{5,30}$/.test(n));
    if (invalid.length > 0) {
      setError(`NISN tidak valid (harus 5-30 digit angka): ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? ", ..." : ""}`);
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkAssignGuruWali({
          teacherId,
          academicYearId,
          ...(studentIds.length > 0 ? { studentIds } : {}),
          ...(nisnList.length > 0 ? { nisns: nisnList } : {}),
        });
        setResults(res);
        setSelected(new Set());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan penugasan massal.");
      }
    });
  }

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results ? results.length - successCount : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Guru Wali</label>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={inputClass}>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Tahun Pelajaran</label>
          <select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className={inputClass}
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year} {y.isActive ? "(aktif)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
        {(
          [
            { value: "pilih", label: "Pilih dari daftar" },
            { value: "nisn", label: "Upload / tempel NISN" },
          ] as const
        ).map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
              mode === m.value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "pilih" ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama / kelas / NISN..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={selectAllFiltered}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Pilih/lepas semua hasil
            </button>
          </div>
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="rounded"
                    />
                    <span className="font-medium">{s.fullName}</span>
                    <span className="text-xs text-slate-500">
                      {s.className}
                      {s.nisn ? ` · NISN ${s.nisn}` : ""}
                    </span>
                  </label>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-500">Tidak ada siswa yang cocok.</li>
              )}
            </ul>
          </div>
          <p className="mt-1 text-xs text-slate-500">{selected.size} siswa terpilih.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Upload Excel (kolom <code>nisn</code>)
            </label>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} className={inputClass} />
            {fileName && <p className="mt-1 text-xs text-slate-500">Dipilih: {fileName}</p>}
            {parseError && <p className="mt-1 text-xs text-red-600">{parseError}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Atau tempel daftar NISN (satu per baris)
            </label>
            <textarea
              value={nisnText}
              onChange={(e) => setNisnText(e.target.value)}
              rows={6}
              placeholder={"0051234567\n0051234568\n0051234569"}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">{nisns.length} NISN terbaca.</p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {isPending ? "Memproses..." : "Tugaskan ke Semua Siswa Terpilih"}
      </button>

      {results && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-2 text-sm font-medium">
            Selesai: {successCount} berhasil, {failCount} gagal/dilewati.
          </p>
          {failCount > 0 && (
            <ul className="max-h-48 overflow-auto text-xs text-red-600">
              {results
                .filter((r) => !r.success)
                .map((r) => (
                  <li key={r.row}>
                    Baris {r.row} ({r.identifier}): {r.message}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
