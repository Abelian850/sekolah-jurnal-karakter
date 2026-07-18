/**
 * Kartu "Siswa Terajin" — daftar siswa dengan pengisian jurnal terbanyak
 * (status submitted/approved) pada periode `days` hari. Dipakai dashboard
 * Kepala Sekolah (/analytics/top-students) dan Admin
 * (/analytics/admin-top-students). Komponen presentasional murni (server
 * component) — data di-fetch oleh halaman pemanggil.
 */

export interface TopStudent {
  studentId: string;
  fullName: string;
  className: string;
  filled: number;
}

const MEDAL_STYLES = [
  "bg-amber-400 text-amber-950", // peringkat 1
  "bg-slate-300 text-slate-700", // peringkat 2
  "bg-orange-300 text-orange-900", // peringkat 3
];

export function TopStudentsCard({
  students,
  days,
}: {
  students: TopStudent[];
  days: number;
}) {
  const maxFilled = Math.max(...students.map((s) => s.filled), 1);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="mb-1 text-base font-semibold">Siswa Terajin</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Peserta didik dengan pengisian jurnal terbanyak (terkirim &amp; disetujui) dalam {days}{" "}
        hari terakhir.
      </p>
      {students.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada jurnal yang dikirim pada periode ini.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {students.map((s, i) => (
            <li key={s.studentId} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  MEDAL_STYLES[i] ?? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{s.fullName}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {s.className} &middot; {s.filled} jurnal
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.round((s.filled / maxFilled) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
