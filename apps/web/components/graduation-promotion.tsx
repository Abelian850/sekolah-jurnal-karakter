"use client";

import { useMemo, useState } from "react";
import {
  graduateBulk,
  promoteBulk,
  type GraduateResult,
  type PromoteResult,
  type ClassMapping,
} from "@/app/dashboard/admin/kelulusan-kenaikan/actions";

interface School {
  id: string;
  name: string;
}

interface Student {
  id: string;
  schoolId: string;
  nisn: string | null;
  fullName: string;
  className: string;
  gradeLevel: string;
}

/** Urutan angkatan untuk tampilan (IX di atas VII). Bukan untuk menebak
 *  kelas tujuan — pemetaan kenaikan tetap diisi manual oleh admin. */
const ROMAN_ORDER: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
  VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
};
const gradeValue = (g: string) => ROMAN_ORDER[g.trim().toUpperCase()] ?? 0;

interface MappingRow {
  fromClassName: string;
  fromGradeLevel: string;
  enabled: boolean;
  toClassName: string;
  toGradeLevel: string;
}

export function GraduationPromotion({
  schools,
  students,
}: {
  schools: School[];
  students: Student[];
}) {
  const [schoolId, setSchoolId] = useState(schools[0].id);
  const schoolStudents = useMemo(
    () => students.filter((s) => s.schoolId === schoolId),
    [students, schoolId]
  );

  return (
    <div className="flex flex-col gap-6">
      {schools.length > 1 && (
        <div className="glass-panel max-w-3xl rounded-2xl p-6">
          <label className="mb-1 block text-sm font-medium">Sekolah</label>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <GraduatePanel key={`g-${schoolId}`} schoolId={schoolId} students={schoolStudents} />
      <PromotePanel key={`p-${schoolId}`} schoolId={schoolId} students={schoolStudents} />
    </div>
  );
}

/* ---------------- Panel 1: Kelulusan massal ---------------- */

function GraduatePanel({ schoolId, students }: { schoolId: string; students: Student[] }) {
  const gradeLevels = useMemo(
    () =>
      [...new Set(students.map((s) => s.gradeLevel))].sort((a, b) => gradeValue(b) - gradeValue(a)),
    [students]
  );
  const [gradeLevel, setGradeLevel] = useState(gradeLevels[0] ?? "");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{
    results: GraduateResult[];
    excludedCount: number;
  } | null>(null);

  const candidates = useMemo(
    () =>
      students
        .filter((s) => s.gradeLevel === gradeLevel)
        .sort((a, b) => a.className.localeCompare(b.className) || a.fullName.localeCompare(b.fullName)),
    [students, gradeLevel]
  );
  const includedCount = candidates.filter((s) => !excluded.has(s.id)).length;

  function toggleExcluded(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (
      !window.confirm(
        `Luluskan ${includedCount} siswa angkatan ${gradeLevel}? Akun login mereka akan dinonaktifkan dan penugasan Guru Wali dilepas. Riwayat jurnal & nilai tetap tersimpan.`
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setOutcome(null);
    try {
      const data = await graduateBulk({
        schoolId,
        gradeLevel,
        excludeStudentIds: [...excluded].filter((id) => candidates.some((s) => s.id === id)),
      });
      setOutcome(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="glass-panel max-w-3xl rounded-2xl p-6">
      <h2 className="mb-1 text-lg font-semibold">1. Kelulusan Massal</h2>
      <p className="mb-4 text-sm text-slate-500">
        Tandai satu angkatan penuh sebagai lulus. Centang siswa yang{" "}
        <strong>tinggal kelas / ditunda</strong> untuk mengecualikannya.
      </p>

      <label className="mb-1 block text-sm font-medium">Angkatan yang lulus</label>
      <select
        value={gradeLevel}
        onChange={(e) => {
          setGradeLevel(e.target.value);
          setExcluded(new Set());
          setOutcome(null);
        }}
        className="mb-4 w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      >
        {gradeLevels.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">Tidak ada siswa aktif pada angkatan ini.</p>
      ) : (
        <>
          <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                <tr className="text-slate-500">
                  <th className="px-3 py-2">Kecualikan</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">NISN</th>
                  <th className="px-3 py-2">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={excluded.has(s.id)}
                        onChange={() => toggleExcluded(s.id)}
                        aria-label={`Kecualikan ${s.fullName}`}
                      />
                    </td>
                    <td className={`px-3 py-1.5 ${excluded.has(s.id) ? "text-slate-400 line-through" : "font-medium"}`}>
                      {s.fullName}
                    </td>
                    <td className="px-3 py-1.5">{s.nisn ?? "-"}</td>
                    <td className="px-3 py-1.5">{s.className}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || includedCount === 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
          >
            {submitting ? "Memproses..." : `Luluskan ${includedCount} siswa`}
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {outcome && (
        <ResultTable
          rows={outcome.results.map((r) => ({
            key: r.row,
            label: `${r.fullName}${r.nisn ? ` (${r.nisn})` : ""}`,
            success: r.success,
            message: r.message,
          }))}
          excludedCount={outcome.excludedCount}
          successVerb="lulus"
        />
      )}
    </div>
  );
}

/* ---------------- Panel 2: Kenaikan kelas massal ---------------- */

function PromotePanel({ schoolId, students }: { schoolId: string; students: Student[] }) {
  const initialRows = useMemo<MappingRow[]>(() => {
    const seen = new Map<string, string>();
    for (const s of students) {
      if (!seen.has(s.className)) seen.set(s.className, s.gradeLevel);
    }
    return [...seen.entries()]
      .sort(
        (a, b) => gradeValue(a[1]) - gradeValue(b[1]) || a[0].localeCompare(b[0])
      )
      .map(([className, gradeLevel]) => ({
        fromClassName: className,
        fromGradeLevel: gradeLevel,
        enabled: true,
        toClassName: "",
        toGradeLevel: "",
      }));
  }, [students]);

  const [rows, setRows] = useState<MappingRow[]>(initialRows);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{
    results: PromoteResult[];
    excludedCount: number;
  } | null>(null);

  function updateRow(i: number, patch: Partial<MappingRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function toggleExcluded(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const enabledRows = rows.filter((r) => r.enabled);
  const invalid = enabledRows.filter(
    (r) =>
      r.toClassName.trim().length < 2 ||
      r.toGradeLevel.trim() === "" ||
      r.toClassName.trim() === r.fromClassName
  );
  const affectedCount = students.filter(
    (s) => enabledRows.some((r) => r.fromClassName === s.className) && !excluded.has(s.id)
  ).length;

  async function handleSubmit() {
    const mappings: ClassMapping[] = enabledRows.map((r) => ({
      fromClassName: r.fromClassName,
      toClassName: r.toClassName.trim(),
      toGradeLevel: r.toGradeLevel.trim(),
    }));
    if (
      !window.confirm(
        `Naikkan ${affectedCount} siswa sesuai ${mappings.length} pemetaan kelas? Siswa yang dicentang "tinggal kelas" tidak diubah.`
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setOutcome(null);
    try {
      const data = await promoteBulk({
        schoolId,
        mappings,
        excludeStudentIds: [...excluded],
      });
      setOutcome(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel max-w-3xl rounded-2xl p-6">
      <h2 className="mb-1 text-lg font-semibold">2. Kenaikan Kelas Massal</h2>
      <p className="mb-4 text-sm text-slate-500">
        Isi kelas &amp; angkatan tujuan untuk setiap kelas asal (mis. VII A &rarr; VIII A).
        Kosongkan centang kelas yang tidak ikut naik (mis. angkatan yang baru saja lulus).
        Jalankan <strong>setelah</strong> kelulusan massal.
      </p>

      <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr className="text-slate-500">
              <th className="px-3 py-2">Ikut</th>
              <th className="px-3 py-2">Kelas asal</th>
              <th className="px-3 py-2">Kelas tujuan</th>
              <th className="px-3 py-2">Angkatan tujuan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.fromClassName} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => updateRow(i, { enabled: e.target.checked })}
                    aria-label={`Sertakan kelas ${r.fromClassName}`}
                  />
                </td>
                <td className="px-3 py-1.5 font-medium">
                  {r.fromClassName}{" "}
                  <span className="text-xs text-slate-400">({r.fromGradeLevel})</span>
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={r.toClassName}
                    onChange={(e) => updateRow(i, { toClassName: e.target.value })}
                    placeholder="mis. VIII A"
                    disabled={!r.enabled}
                    className="w-28 rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    value={r.toGradeLevel}
                    onChange={(e) => updateRow(i, { toGradeLevel: e.target.value })}
                    placeholder="mis. VIII"
                    disabled={!r.enabled}
                    className="w-20 rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mb-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
        <summary className="cursor-pointer font-medium">
          Siswa tinggal kelas (dikecualikan): {excluded.size}
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {enabledRows.map((r) => {
            const inClass = students
              .filter((s) => s.className === r.fromClassName)
              .sort((a, b) => a.fullName.localeCompare(b.fullName));
            return (
              <div key={r.fromClassName} className="mb-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {r.fromClassName}
                </p>
                {inClass.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 py-0.5">
                    <input
                      type="checkbox"
                      checked={excluded.has(s.id)}
                      onChange={() => toggleExcluded(s.id)}
                    />
                    <span className={excluded.has(s.id) ? "text-slate-400 line-through" : ""}>
                      {s.fullName} {s.nisn ? `(${s.nisn})` : ""}
                    </span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      </details>

      {invalid.length > 0 && enabledRows.length > 0 && (
        <p className="mb-3 text-sm text-amber-600">
          Lengkapi kelas &amp; angkatan tujuan (dan pastikan berbeda dari kelas asal) untuk:{" "}
          {invalid.map((r) => r.fromClassName).join(", ")}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || enabledRows.length === 0 || invalid.length > 0 || affectedCount === 0}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
      >
        {submitting ? "Memproses..." : `Naikkan ${affectedCount} siswa`}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {outcome && (
        <ResultTable
          rows={outcome.results.map((r) => ({
            key: r.row,
            label: `${r.fullName}${r.nisn ? ` (${r.nisn})` : ""}: ${r.from} → ${r.to}`,
            success: r.success,
            message: r.message,
          }))}
          excludedCount={outcome.excludedCount}
          successVerb="naik kelas"
        />
      )}
    </div>
  );
}

/* ---------------- Tabel hasil per baris (pola bulk lain) ---------------- */

function ResultTable({
  rows,
  excludedCount,
  successVerb,
}: {
  rows: Array<{ key: number; label: string; success: boolean; message?: string }>;
  excludedCount: number;
  successVerb: string;
}) {
  const ok = rows.filter((r) => r.success).length;
  const fail = rows.length - ok;
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-medium">
        Hasil: {ok} {successVerb}, {fail} gagal
        {excludedCount > 0 ? `, ${excludedCount} dikecualikan (tidak diubah)` : ""}.
      </p>
      {rows.length > 0 && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <td className="px-3 py-1.5">
                    {r.success ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <span className="text-red-600">✗</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">{r.label}</td>
                  <td className="px-3 py-1.5 text-slate-500">{r.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
