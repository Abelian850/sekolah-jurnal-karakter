import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { getTodayDateWIB, formatDateID } from "@/lib/date";
import { SchoolFilter } from "@/components/school-filter";
import { TopStudentsCard, type TopStudent } from "@/components/top-students-card";

interface School {
  id: string;
  name: string;
}

interface AnalyticsSummary {
  date: string;
  days: number;
  schoolId: string | null;
  counts: { activeStudents: number; teachers: number; guruWali: number };
  today: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    belumMembuat: number;
  };
  verification: { disetujui: number; ditolak: number; revisi: number; menunggu: number };
  avgScore: number | null;
  avgScoreByClass: { className: string; avgScore: number; scored: number }[];
  trend: { date: string; sent: number }[];
}

const CARD_STYLES = {
  blue: { chip: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200", accent: "border-t-brand-500" },
  violet: { chip: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300", accent: "border-t-violet-500" },
  teal: { chip: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300", accent: "border-t-teal-500" },
  amber: { chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", accent: "border-t-amber-500" },
} as const;

function StatCard({
  label,
  value,
  hint,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  color: keyof typeof CARD_STYLES;
  icon: React.ReactNode;
}) {
  const style = CARD_STYLES[color];
  return (
    <div className={`glass-panel rounded-2xl border-t-4 p-5 ${style.accent}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.chip}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-sm text-slate-600 sm:w-40 dark:text-slate-400">
        {label}
      </span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
        {value} ({pct}%)
      </span>
    </div>
  );
}

/* Ikon inline (outline, 24px) - tanpa dependensi ikon eksternal. */
const icons = {
  students: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2 8.5l10 5.5 8.16-4.49V15M6 11.7v4.55C6 17.77 8.69 20 12 20s6-2.23 6-3.75V11.7" />
    </svg>
  ),
  teachers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
  guruWali: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 5 6v5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6l-7-2.5ZM9.5 12l2 2 3.5-4" />
    </svg>
  ),
  score: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 14.4 8.7l5.6.7-4.1 3.9 1.1 5.6-5-2.8-5 2.8 1.1-5.6L4 9.4l5.6-.7L12 3.5Z" />
    </svg>
  ),
};

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string }>;
}) {
  const { schoolId: schoolIdParam } = await searchParams;
  const today = getTodayDateWIB();

  let schools: School[] = [];
  let summary: AnalyticsSummary | null = null;
  let topStudents: TopStudent[] = [];
  let errorMessage: string | null = null;

  try {
    schools = await apiFetch<School[]>("/schools");
    const selected = schools.some((s) => s.id === schoolIdParam) ? schoolIdParam : null;
    const query = selected ? `&schoolId=${selected}` : "";
    summary = await apiFetch<AnalyticsSummary>(
      `/analytics/admin-summary?date=${today}&days=30${query}`
    );
    const top = await apiFetch<{ students: TopStudent[] }>(
      `/analytics/admin-top-students?date=${today}&days=30&limit=10${query}`
    );
    topStudents = top.students;
  } catch (err) {
    errorMessage =
      err instanceof ApiRequestError ? err.message : "Gagal memuat data ringkasan.";
  }

  if (!summary) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Ringkasan</h1>
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      </div>
    );
  }

  const selectedSchool = schools.find((s) => s.id === summary.schoolId) ?? null;
  const { counts, today: t, verification: v, avgScore, avgScoreByClass, trend } = summary;
  const totalVerif = v.disetujui + v.ditolak + v.revisi + v.menunggu;
  const maxTrend = Math.max(...trend.map((d) => d.sent), 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero berwarna: identitas halaman + filter sekolah */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white shadow-sm sm:p-8 dark:from-brand-900 dark:to-indigo-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ringkasan</h1>
            <p className="mt-1 text-sm text-white/80">
              {formatDateID(today)} &middot;{" "}
              {selectedSchool ? selectedSchool.name : "Semua sekolah"}
            </p>
          </div>
          {schools.length > 0 && (
            <SchoolFilter schools={schools} selectedId={selectedSchool?.id ?? null} />
          )}
        </div>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Peserta Didik Aktif"
          value={counts.activeStudents}
          color="blue"
          icon={icons.students}
        />
        <StatCard label="Guru" value={counts.teachers} color="violet" icon={icons.teachers} />
        <StatCard label="Guru Wali" value={counts.guruWali} color="teal" icon={icons.guruWali} />
        <StatCard
          label="Rata-rata Nilai Karakter"
          value={avgScore ?? "-"}
          hint="Dari jurnal yang dinilai 30 hari terakhir"
          color="amber"
          icon={icons.score}
        />
      </div>

      {/* Diagram status hari ini & verifikasi */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-lg font-semibold">Jurnal Hari Ini</h2>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            Status pengisian jurnal seluruh peserta didik aktif hari ini.
          </p>
          <div className="flex flex-col gap-3">
            <Bar label="Disetujui" value={t.approved} total={counts.activeStudents} colorClass="bg-green-500" />
            <Bar label="Terkirim (menunggu)" value={t.submitted} total={counts.activeStudents} colorClass="bg-blue-500" />
            <Bar label="Masih draft" value={t.draft} total={counts.activeStudents} colorClass="bg-amber-500" />
            <Bar label="Ditolak" value={t.rejected} total={counts.activeStudents} colorClass="bg-red-500" />
            <Bar label="Belum membuat" value={t.belumMembuat} total={counts.activeStudents} colorClass="bg-slate-400" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-lg font-semibold">Verifikasi 30 Hari Terakhir</h2>
          <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
            Hasil pemeriksaan jurnal oleh Guru Wali.
          </p>
          <div className="flex flex-col gap-3">
            <Bar label="Disetujui" value={v.disetujui} total={totalVerif} colorClass="bg-green-500" />
            <Bar label="Perlu revisi" value={v.revisi} total={totalVerif} colorClass="bg-amber-500" />
            <Bar label="Ditolak" value={v.ditolak} total={totalVerif} colorClass="bg-red-500" />
            <Bar label="Menunggu diperiksa" value={v.menunggu} total={totalVerif} colorClass="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Tren pengiriman 7 hari */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-1 text-lg font-semibold">Performa Pengisian - 7 Hari Terakhir</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Jumlah jurnal yang dikirim siswa per hari (termasuk yang sudah diverifikasi), dari
          total {counts.activeStudents} peserta didik aktif.
        </p>
        <div className="flex items-end gap-2 sm:gap-3" style={{ height: "11rem" }}>
          {trend.map((d, i) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400">
                {d.sent}
              </span>
              <div
                className={`w-full max-w-14 rounded-t-lg ${i === trend.length - 1 ? "bg-brand-600" : "bg-brand-200 dark:bg-brand-900"}`}
                style={{
                  height: `${Math.max(Math.round((d.sent / maxTrend) * 120), d.sent > 0 ? 8 : 3)}px`,
                }}
              />
              <span className="text-xs text-slate-400">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Siswa paling rajin mengisi jurnal */}
      <TopStudentsCard students={topStudents} days={30} />

      {/* Nilai karakter per kelas */}
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-1 text-lg font-semibold">Rata-rata Nilai Karakter per Kelas</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Dari jurnal yang disetujui Guru Wali dalam 30 hari terakhir.
        </p>
        {avgScoreByClass.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada jurnal yang dinilai pada periode ini.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {avgScoreByClass.map((row) => (
              <div key={row.className} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-slate-600 sm:w-40 dark:text-slate-400">
                  {row.className}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500"
                    style={{ width: `${row.avgScore}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                  {row.avgScore} ({row.scored} jurnal)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
