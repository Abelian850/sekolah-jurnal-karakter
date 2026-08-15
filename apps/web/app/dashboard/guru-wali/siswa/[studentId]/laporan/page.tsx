import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID, getTodayDateWIB } from "@/lib/date";
import { toReportScore } from "@sjk/shared";
import { PrintButton } from "@/components/print-button";

/**
 * Laporan per-siswa (Guru Wali) — halaman printable. Data dari
 * GET /analytics/student-report; PDF dihasilkan lewat dialog print browser
 * (window.print), BUKAN di Workers. Elemen non-laporan (topbar, nav,
 * kontrol periode) disembunyikan saat print via @media print + print:hidden.
 *
 * Periode = satu bulan (?bulan=YYYY-MM, default bulan berjalan yang
 * dipotong ke hari ini WIB — pola sama dengan download-guru-wali-report).
 */

interface StudentReport {
  meta: {
    schoolName: string;
    teacherName: string;
    from: string;
    to: string;
    totalDays: number;
  };
  student: {
    id: string;
    fullName: string;
    nisn: string | null;
    nis: string | null;
    className: string;
    photoUrl: string | null;
  };
  summary: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    daysWithoutJournal: number;
    avgScore: number | null;
    commentCount: number;
  };
  habits: {
    templateItemId: string;
    itemName: string;
    orderIndex: number;
    selesai: number;
    total: number;
  }[];
  lastPhoto: { photoUrl: string | null; itemName: string; journalDate: string } | null;
  lastNote: { note: string | null; journalDate: string } | null;
}

function periodRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let to = `${month}-${String(lastDay).padStart(2, "0")}`;
  const today = getTodayDateWIB();
  if (today.slice(0, 7) === month && today < to) to = today;
  return { from, to };
}

function percent(selesai: number, total: number): number {
  return total > 0 ? Math.round((selesai / total) * 100) : 0;
}

export default async function LaporanSiswaPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { studentId } = await params;
  const { bulan } = await searchParams;
  const today = getTodayDateWIB();
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ? bulan : today.slice(0, 7);
  const { from, to } = periodRange(month);

  let report: StudentReport | null = null;
  let errorMessage: string | null = null;
  try {
    report = await apiFetch<StudentReport>(
      `/analytics/student-report?studentId=${encodeURIComponent(studentId)}&from=${from}&to=${to}`
    );
  } catch (err) {
    if (err instanceof ApiRequestError) errorMessage = err.message;
    else throw err;
  }

  if (!report) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Laporan Siswa</h1>
        <p className="text-sm text-slate-500">{errorMessage ?? "Data tidak ditemukan."}</p>
        <Link
          href="/dashboard/guru-wali"
          className="mt-4 inline-block text-sm text-brand-600 hover:underline"
        >
          Kembali ke dashboard
        </Link>
      </div>
    );
  }

  const s = report.summary;
  const filled = s.draft + s.submitted + s.approved + s.rejected;

  return (
    <div>
      {/* CSS khusus cetak:
          1. Sembunyikan topbar & nav layout (satu-satunya <header>/<nav>).
          2. print-color-adjust: exact — WAJIB, karena browser secara default
             TIDAK mencetak background-color. Tanpa ini bar Capaian 7
             Kebiasaan dan kartu ringkasan hilang total di PDF.
          3. break-inside: avoid pada blok yang tidak boleh terbelah halaman
             (tanda tangan, bukti foto, tiap baris kebiasaan). */}
      <style>{`@page { size: A4; margin: 12mm; }
      @media print {
        header, nav { display: none !important; }
        .glass-panel { box-shadow: none !important; border: none !important; }
        body { background: white !important; }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .cetak-utuh { break-inside: avoid; page-break-inside: avoid; }
        /* 4. Pemadatan khusus cetak agar laporan satu murid muat dalam SATU
           halaman A4. Sebelumnya tinggi konten ~1050px sedangkan area cetak
           A4 dengan margin 12mm hanya ~1032px; karena blok tanda tangan
           memakai break-inside:avoid, kelebihan ~18px itu mendorong SELURUH
           blok tanda tangan (113px) ke halaman 2. Aturan di bawah memangkas
           ~150px dan TIDAK mengubah tampilan di layar. */
        .cetak-identitas { padding-top: 0.75rem !important; padding-bottom: 0.75rem !important; }
        .cetak-subjudul { margin-top: 1rem !important; }
        .cetak-baris-kebiasaan { grid-template-columns: 210px 1fr 48px !important; }
        .cetak-foto { height: 8rem !important; }
        .cetak-ttd { margin-top: 1.5rem !important; }
        .cetak-ttd .cetak-garis-ttd { margin-top: 2.5rem !important; }
      }`}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/guru-wali" className="text-sm text-brand-600 hover:underline">
          &larr; Kembali ke dashboard
        </Link>
        <div className="flex items-center gap-3">
          <form method="GET" className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              Bulan{" "}
              <input
                type="month"
                name="bulan"
                defaultValue={month}
                max={today.slice(0, 7)}
                className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Terapkan
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-8 print:p-0">
        <div className="border-b border-slate-300 pb-4 dark:border-slate-700">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">Laporan Jurnal Karakter Siswa</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">{report.meta.schoolName}</p>
            </div>
            <div className="text-right text-xs text-slate-500 dark:text-slate-400">
              <p>
                Periode: {formatDateID(report.meta.from)} s.d. {formatDateID(report.meta.to)}
              </p>
              <p>Dicetak: {formatDateID(today)}</p>
            </div>
          </div>
        </div>

        <div className="cetak-identitas flex items-center gap-4 py-5">
          {report.student.photoUrl ? (
            // Sengaja <img> biasa, bukan next/image: sumbernya diproksi lewat
            // /api/foto (bucket R2 privat) dan optimasi gambar Next tidak
            // aktif pada deployment OpenNext/Workers.
            <img
              src={report.student.photoUrl}
              alt={`Foto ${report.student.fullName}`}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              {report.student.fullName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="text-base font-semibold">{report.student.fullName}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {report.student.nisn ? `NISN ${report.student.nisn} · ` : ""}
              Kelas {report.student.className} · Guru Wali: {report.meta.teacherName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Jurnal terisi</p>
            <p className="text-xl font-semibold">
              {filled}
              <span className="text-xs font-normal text-slate-500">
                /{report.meta.totalDays} hari
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Disetujui</p>
            <p className="text-xl font-semibold">{s.approved}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Rata-rata nilai</p>
            <p className="text-xl font-semibold">{toReportScore(s.avgScore) ?? "-"}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-xs text-slate-500 dark:text-slate-400">Komentar orang tua</p>
            <p className="text-xl font-semibold">{s.commentCount}</p>
          </div>
        </div>

        <h2 className="cetak-subjudul mb-2 mt-6 text-sm font-semibold">Capaian 7 Kebiasaan</h2>
        {report.habits.length === 0 ? (
          <p className="text-sm text-slate-500">
            Belum ada jurnal terkirim/disetujui pada periode ini.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {report.habits.map((h) => {
              const pct = percent(h.selesai, h.total);
              return (
                <div
                  key={h.templateItemId}
                  className="cetak-utuh cetak-baris-kebiasaan grid grid-cols-[170px_1fr_48px] items-center gap-3 text-sm"
                >
                  <span>{h.itemName}</span>
                  <div className="h-2 rounded bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-2 rounded ${pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums text-slate-600 dark:text-slate-400">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <h2 className="cetak-subjudul mb-2 mt-6 text-sm font-semibold">
          Bukti Foto Terakhir (Terverifikasi)
        </h2>
        {report.lastPhoto?.photoUrl ? (
          <div className="cetak-utuh flex flex-wrap items-start gap-4">
            <img
              src={report.lastPhoto.photoUrl}
              alt={`Bukti ${report.lastPhoto.itemName}`}
              className="cetak-foto h-40 w-52 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
            />
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {report.lastPhoto.itemName}
                </span>{" "}
                · {formatDateID(report.lastPhoto.journalDate)}
              </p>
              <p className="mt-1">
                Foto bukti paling baru dari jurnal yang sudah disetujui Guru Wali dalam periode
                laporan.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Belum ada foto bukti pada jurnal terverifikasi di periode ini.
          </p>
        )}

        <h2 className="cetak-subjudul mb-2 mt-6 text-sm font-semibold">Catatan Guru Wali</h2>
        {report.lastNote?.note ? (
          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            {report.lastNote.note}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Belum ada catatan verifikasi pada periode ini.</p>
        )}

        <div className="cetak-utuh cetak-ttd mt-10 grid grid-cols-2 gap-8 pb-2 text-center text-sm">
          <div>
            <p className="text-slate-600 dark:text-slate-400">Mengetahui, Guru Wali</p>
            <p className="cetak-garis-ttd mt-14 border-t border-slate-400 pt-2 font-medium">
              {report.meta.teacherName}
            </p>
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-400">Orang Tua / Wali Murid</p>
            <p className="cetak-garis-ttd mt-14 border-t border-slate-400 pt-2 font-medium">
              (............................)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
