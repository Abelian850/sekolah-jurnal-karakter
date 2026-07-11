import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID, getTodayDateWIB } from "@/lib/date";
import { StatusCalendar, CalendarLegend, type CalendarMark } from "@/components/status-calendar";
import { StatCard, Bar } from "@/components/stat-widgets";

interface StudentProfile {
  id: string;
  fullName: string;
  className: string;
  nis: string;
}

interface StudentStats {
  date: string;
  month: string;
  days: number;
  distribution: { draft: number; submitted: number; approved: number; rejected: number };
  avgScore: number | null;
  scoreTrend: { date: string; score: number | null }[];
  calendar: { date: string; status: "draft" | "submitted" | "approved" | "rejected" }[];
}

const STATUS_MARK: Record<StudentStats["calendar"][number]["status"], CalendarMark> = {
  approved: {
    colorClass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    title: "Disetujui Guru Wali",
  },
  submitted: {
    colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    title: "Terkirim, menunggu diperiksa",
  },
  rejected: {
    colorClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    title: "Ditolak",
  },
  draft: {
    colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    title: "Masih draft, belum dikirim",
  },
};

export default async function PesertaDidikHomePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { bulan } = await searchParams;
  const today = getTodayDateWIB();
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ? bulan : today.slice(0, 7);

  let student: StudentProfile | null = null;
  let stats: StudentStats | null = null;
  try {
    [student, stats] = await Promise.all([
      apiFetch<StudentProfile>("/students/me"),
      apiFetch<StudentStats>(`/journals/stats?date=${today}&month=${month}&days=30`),
    ]);
  } catch (err) {
    if (!(err instanceof ApiRequestError) || err.statusCode !== 404) throw err;
  }

  if (!student || !stats) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Dashboard Peserta Didik</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Profil peserta didik untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      </div>
    );
  }

  const marks: Record<string, CalendarMark> = {};
  for (const day of stats.calendar) marks[day.date] = STATUS_MARK[day.status];

  const dist = stats.distribution;
  const totalJournals = dist.draft + dist.submitted + dist.approved + dist.rejected;

  return (
    <div>
      <div className="glass-panel mb-6 rounded-2xl p-6">
        <h1 className="mb-1 text-xl font-semibold">Halo, {student.fullName}</h1>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Kelas {student.className} &middot; {formatDateID(today)}
        </p>

        <div className="flex gap-2">
          <Link
            href="/dashboard/peserta-didik/jurnal"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Isi Jurnal Hari Ini
          </Link>
          <Link
            href="/dashboard/peserta-didik/riwayat"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Lihat Riwayat
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Jurnal (30 hari)" value={totalJournals} />
        <StatCard label="Disetujui (30 hari)" value={dist.approved} />
        <StatCard label="Rata-rata Nilai Karakter" value={stats.avgScore ?? "-"} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-base font-semibold">Kalender Jurnalku</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Status jurnal harianmu per tanggal. Tanggal tanpa warna berarti belum
            ada jurnal.
          </p>
          <StatusCalendar
            month={month}
            today={today}
            marks={marks}
            basePath="/dashboard/peserta-didik"
          >
            <CalendarLegend
              items={[
                { colorClass: "bg-green-400", label: "Disetujui" },
                { colorClass: "bg-blue-400", label: "Menunggu diperiksa" },
                { colorClass: "bg-red-400", label: "Ditolak" },
                { colorClass: "bg-amber-400", label: "Draft" },
              ]}
            />
          </StatusCalendar>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-base font-semibold">Jurnalku 30 Hari Terakhir</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Status semua jurnal yang kamu buat pada periode ini.
          </p>
          <div className="flex flex-col gap-2.5">
            <Bar label="Disetujui" value={dist.approved} total={totalJournals} colorClass="bg-green-500" />
            <Bar label="Menunggu diperiksa" value={dist.submitted} total={totalJournals} colorClass="bg-blue-500" />
            <Bar label="Masih draft" value={dist.draft} total={totalJournals} colorClass="bg-amber-500" />
            <Bar label="Ditolak" value={dist.rejected} total={totalJournals} colorClass="bg-red-500" />
          </div>

          <h2 className="mb-1 mt-8 text-base font-semibold">Nilai Karakter 7 Hari Terakhir</h2>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            Nilai dari Guru Wali per hari (0-100). Strip berarti jurnal hari itu
            belum dinilai.
          </p>
          <div className="flex items-end gap-2" style={{ height: "7rem" }}>
            {stats.scoreTrend.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                  {d.score ?? "-"}
                </span>
                <div
                  className={`w-full rounded-t ${d.score !== null ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-800"}`}
                  style={{
                    height: `${d.score !== null ? Math.max(Math.round((d.score / 100) * 64), 6) : 2}px`,
                  }}
                />
                <span className="text-[10px] text-slate-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
