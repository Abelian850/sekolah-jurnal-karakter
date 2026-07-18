import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { Topbar } from "@/components/topbar";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { getTodayDateWIB, formatDateID } from "@/lib/date";
import { TopStudentsCard, type TopStudent } from "@/components/top-students-card";

interface AnalyticsSummary {
  date: string;
  days: number;
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
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
      <span className="w-32 shrink-0 text-xs text-slate-600 dark:text-slate-400">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-slate-600 dark:text-slate-400">
        {value} ({pct}%)
      </span>
    </div>
  );
}

export default async function KepalaSekolahDashboardPage() {
  await requireRole([ROLES.KEPALA_SEKOLAH]);

  const today = getTodayDateWIB();
  let summary: AnalyticsSummary | null = null;
  let topStudents: TopStudent[] = [];
  let errorMessage: string | null = null;

  try {
    summary = await apiFetch<AnalyticsSummary>(`/analytics/summary?date=${today}&days=30`);
    const top = await apiFetch<{ students: TopStudent[] }>(
      `/analytics/top-students?date=${today}&days=30&limit=10`
    );
    topStudents = top.students;
  } catch (err) {
    errorMessage =
      err instanceof ApiRequestError ? err.message : "Gagal memuat data analitik sekolah.";
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Topbar />
        <div className="glass-panel rounded-2xl p-6">
          <h1 className="mb-2 text-xl font-semibold">Dashboard Kepala Sekolah</h1>
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const { counts, today: t, verification: v, avgScore, avgScoreByClass, trend } = summary;
  const totalVerif = v.disetujui + v.ditolak + v.revisi + v.menunggu;
  const maxTrend = Math.max(...trend.map((d) => d.sent), 1);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Topbar />

      <div className="mb-6">
        <h1 className="text-xl font-semibold">Dashboard Kepala Sekolah</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateID(summary.date)}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Peserta Didik Aktif" value={counts.activeStudents} />
        <StatCard label="Guru" value={counts.teachers} />
        <StatCard label="Guru Wali" value={counts.guruWali} />
        <StatCard
          label="Rata-rata Nilai Karakter (30 hari)"
          value={avgScore ?? "-"}
        />
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-base font-semibold">Jurnal Hari Ini</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Status pengisian jurnal seluruh peserta didik aktif pada tanggal di atas.
          </p>
          <div className="flex flex-col gap-2.5">
            <Bar label="Disetujui" value={t.approved} total={counts.activeStudents} colorClass="bg-green-500" />
            <Bar label="Terkirim (menunggu)" value={t.submitted} total={counts.activeStudents} colorClass="bg-blue-500" />
            <Bar label="Masih draft" value={t.draft} total={counts.activeStudents} colorClass="bg-amber-500" />
            <Bar label="Ditolak" value={t.rejected} total={counts.activeStudents} colorClass="bg-red-500" />
            <Bar label="Belum membuat" value={t.belumMembuat} total={counts.activeStudents} colorClass="bg-slate-400" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-base font-semibold">Verifikasi 30 Hari Terakhir</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Hasil pemeriksaan jurnal oleh Guru Wali.
          </p>
          <div className="flex flex-col gap-2.5">
            <Bar label="Disetujui" value={v.disetujui} total={totalVerif} colorClass="bg-green-500" />
            <Bar label="Perlu revisi" value={v.revisi} total={totalVerif} colorClass="bg-amber-500" />
            <Bar label="Ditolak" value={v.ditolak} total={totalVerif} colorClass="bg-red-500" />
            <Bar label="Menunggu diperiksa" value={v.menunggu} total={totalVerif} colorClass="bg-blue-500" />
          </div>
        </div>
      </div>

      <div className="mb-6 glass-panel rounded-2xl p-6">
        <h2 className="mb-1 text-base font-semibold">Jurnal Terkirim 7 Hari Terakhir</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Jumlah jurnal yang dikirim siswa per hari (termasuk yang sudah diverifikasi),
          dari total {counts.activeStudents} peserta didik aktif.
        </p>
        <div className="flex items-end gap-2" style={{ height: "8rem" }}>
          {trend.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                {d.sent}
              </span>
              <div
                className="w-full rounded-t bg-brand-600"
                style={{
                  height: `${Math.max(Math.round((d.sent / maxTrend) * 88), d.sent > 0 ? 6 : 2)}px`,
                }}
              />
              <span className="text-[10px] text-slate-400">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <TopStudentsCard students={topStudents} days={30} />
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-1 text-base font-semibold">Rata-rata Nilai Karakter per Kelas</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Dari jurnal yang disetujui Guru Wali dalam 30 hari terakhir.
        </p>
        {avgScoreByClass.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada jurnal yang dinilai pada periode ini.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {avgScoreByClass.map((row) => (
              <div key={row.className} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-slate-600 dark:text-slate-400">
                  {row.className}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${row.avgScore}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-600 dark:text-slate-400">
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
