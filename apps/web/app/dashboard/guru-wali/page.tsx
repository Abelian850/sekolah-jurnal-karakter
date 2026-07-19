import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID, getTodayDateWIB } from "@/lib/date";
import { StatusCalendar, CalendarLegend, type CalendarMark } from "@/components/status-calendar";
import { StatCard, Bar } from "@/components/stat-widgets";
import { DownloadGuruWaliReport } from "@/components/download-guru-wali-report";

interface PendingJournal {
  id: string;
  journalDate: string;
  status: string;
  submittedAt: string | null;
  studentId: string;
  studentName: string;
  className: string;
}

interface GuruWaliStats {
  date: string;
  month: string;
  days: number;
  counts: { activeStudents: number; pending: number };
  verification: { disetujui: number; ditolak: number; revisi: number; menunggu: number };
  trend: { date: string; sent: number }[];
  calendar: {
    date: string;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
  }[];
}

/**
 * Warna sel kalender per tanggal, prioritas: ada yang menunggu diperiksa
 * (biru) > ada yang ditolak (merah) > ada yang disetujui (hijau) > hanya
 * draft (kuning). Tooltip merinci semua angka.
 */
function buildMarks(calendar: GuruWaliStats["calendar"]): Record<string, CalendarMark> {
  const marks: Record<string, CalendarMark> = {};
  for (const day of calendar) {
    const parts: string[] = [];
    if (day.submitted > 0) parts.push(`${day.submitted} menunggu diperiksa`);
    if (day.approved > 0) parts.push(`${day.approved} disetujui`);
    if (day.rejected > 0) parts.push(`${day.rejected} ditolak`);
    if (day.draft > 0) parts.push(`${day.draft} draft`);
    if (parts.length === 0) continue;

    const colorClass =
      day.submitted > 0
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
        : day.rejected > 0
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          : day.approved > 0
            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

    marks[day.date] = { colorClass, title: parts.join(" · ") };
  }
  return marks;
}

export default async function GuruWaliDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { bulan } = await searchParams;
  const today = getTodayDateWIB();
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ? bulan : today.slice(0, 7);

  let journals: PendingJournal[] = [];
  let stats: GuruWaliStats | null = null;
  let profileMissing = false;
  try {
    [journals, stats] = await Promise.all([
      apiFetch<PendingJournal[]>("/verifications/pending"),
      apiFetch<GuruWaliStats>(`/verifications/stats?date=${today}&month=${month}&days=30`),
    ]);
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) {
      profileMissing = true;
    } else {
      throw err;
    }
  }

  if (profileMissing || !stats) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Dashboard Guru Wali</h1>
        <p className="text-sm text-slate-500">
          Profil guru untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      </div>
    );
  }

  const v = stats.verification;
  const totalVerif = v.disetujui + v.ditolak + v.revisi + v.menunggu;
  const maxTrend = Math.max(...stats.trend.map((d) => d.sent), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Dashboard Guru Wali</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDateID(today)}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Siswa Binaan Aktif" value={stats.counts.activeStudents} />
        <StatCard label="Menunggu Verifikasi" value={stats.counts.pending} />
        <StatCard label="Disetujui (30 hari)" value={v.disetujui} />
      </div>

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-base font-semibold">Kalender Jurnal Binaan</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Rekap status jurnal siswa binaan per tanggal. Arahkan kursor ke tanggal
            untuk melihat rinciannya.
          </p>
          <StatusCalendar
            month={month}
            today={today}
            marks={buildMarks(stats.calendar)}
            basePath="/dashboard/guru-wali"
          >
            <CalendarLegend
              items={[
                { colorClass: "bg-blue-400", label: "Ada yang menunggu" },
                { colorClass: "bg-green-400", label: "Disetujui" },
                { colorClass: "bg-red-400", label: "Ada yang ditolak" },
                { colorClass: "bg-amber-400", label: "Masih draft" },
              ]}
            />
          </StatusCalendar>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-base font-semibold">Verifikasi 30 Hari Terakhir</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Hasil pemeriksaan jurnal siswa binaan Anda.
          </p>
          <div className="flex flex-col gap-2.5">
            <Bar label="Disetujui" value={v.disetujui} total={totalVerif} colorClass="bg-green-500" />
            <Bar label="Perlu revisi" value={v.revisi} total={totalVerif} colorClass="bg-amber-500" />
            <Bar label="Ditolak" value={v.ditolak} total={totalVerif} colorClass="bg-red-500" />
            <Bar label="Menunggu diperiksa" value={v.menunggu} total={totalVerif} colorClass="bg-blue-500" />
          </div>

          <h2 className="mb-1 mt-8 text-base font-semibold">Jurnal Terkirim 7 Hari Terakhir</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Jumlah jurnal yang dikirim siswa binaan per hari, dari total{" "}
            {stats.counts.activeStudents} siswa.
          </p>
          <div className="flex items-end gap-2" style={{ height: "7rem" }}>
            {stats.trend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                  {d.sent}
                </span>
                <div
                  className="w-full rounded-t bg-brand-600"
                  style={{
                    height: `${Math.max(Math.round((d.sent / maxTrend) * 64), d.sent > 0 ? 6 : 2)}px`,
                  }}
                />
                <span className="text-[10px] text-slate-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <DownloadGuruWaliReport />
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-1 text-base font-semibold">Menunggu Verifikasi</h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Jurnal siswa binaan yang sudah dikirim dan menunggu diperiksa, terlama dulu.
        </p>

        {journals.length === 0 ? (
          <p className="text-sm text-slate-500">
            Tidak ada jurnal yang menunggu verifikasi. Kerja bagus!
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                <th className="py-2">Tanggal Jurnal</th>
                <th className="py-2">Siswa</th>
                <th className="py-2">Kelas</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2">{formatDateID(j.journalDate)}</td>
                  <td className="py-2 font-medium">{j.studentName}</td>
                  <td className="py-2">{j.className}</td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard/guru-wali/verifikasi/${j.id}`}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
                    >
                      Periksa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
