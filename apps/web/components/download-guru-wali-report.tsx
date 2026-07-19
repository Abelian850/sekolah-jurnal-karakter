"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  getGuruWaliRecap,
  type GuruWaliRecap,
} from "@/app/dashboard/guru-wali/laporan-actions";

/**
 * Unduh laporan rekap jurnal siswa binaan (Guru Wali) dalam dua format
 * dari SATU endpoint yang sama (/analytics/guru-wali-recap):
 * - Excel : SheetJS — pola persis components/export-students-button.tsx.
 * - PDF   : jsPDF + jspdf-autotable, di-import DINAMIS di dalam handler
 *           supaya ±350KB library-nya tidak membebani bundle halaman
 *           dashboard (hanya terunduh saat tombol PDF pertama kali diklik).
 * Keduanya digenerate DI BROWSER — lihat docs/bulk-import-export.md.
 *
 * Periode = satu bulan (default bulan berjalan). Untuk bulan berjalan,
 * tanggal akhir dipotong ke "hari ini" WIB supaya kolom "Hari Tanpa
 * Jurnal" tidak menghitung hari yang belum terjadi.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function todayWIB(): string {
  return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

function periodRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let to = `${month}-${String(lastDay).padStart(2, "0")}`;
  const today = todayWIB();
  if (today.slice(0, 7) === month && today < to) to = today;
  return { from, to };
}

function formatShortID(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Baris tabel rekap — dipakai Excel & PDF supaya isinya identik. */
function recapRows(data: GuruWaliRecap): (string | number)[][] {
  return data.students.map((s, i) => [
    i + 1,
    s.fullName,
    s.nisn ?? "",
    s.className,
    s.submitted,
    s.approved,
    s.rejected,
    s.draft,
    s.daysWithoutJournal,
    s.avgScore ?? "-",
  ]);
}

const RECAP_HEADER = [
  "No",
  "Nama",
  "NISN",
  "Kelas",
  "Terkirim (menunggu)",
  "Disetujui",
  "Ditolak",
  "Draft",
  "Hari Tanpa Jurnal",
  "Rata-rata Nilai",
];

/** Baris tabel 7 Kebiasaan: nama + kelas + kolom per kebiasaan. */
function habitTable(data: GuruWaliRecap): {
  header: string[];
  rows: (string | number)[][];
} {
  const countMap = new Map<string, number>();
  for (const hc of data.habitCounts) {
    countMap.set(`${hc.studentId}:${hc.templateItemId}`, hc.selesai);
  }
  return {
    header: ["No", "Nama", "Kelas", ...data.habits.map((h) => h.itemName)],
    rows: data.students.map((s, i) => [
      i + 1,
      s.fullName,
      s.className,
      ...data.habits.map((h) => countMap.get(`${s.studentId}:${h.templateItemId}`) ?? 0),
    ]),
  };
}

function metaLines(data: GuruWaliRecap): string[] {
  return [
    data.meta.schoolName,
    "Laporan Jurnal Karakter Siswa Binaan",
    `Guru Wali: ${data.meta.teacherName}`,
    `Periode: ${formatShortID(data.meta.from)} s.d. ${formatShortID(data.meta.to)} (${data.meta.totalDays} hari)`,
  ];
}

function fileName(data: GuruWaliRecap, ext: string): string {
  return `laporan-jurnal-${slug(data.meta.teacherName)}-${data.meta.from}_${data.meta.to}.${ext}`;
}

function buildExcel(data: GuruWaliRecap) {
  const workbook = XLSX.utils.book_new();

  const recapSheet = XLSX.utils.aoa_to_sheet([
    ...metaLines(data).map((l) => [l]),
    [],
    RECAP_HEADER,
    ...recapRows(data),
  ]);
  XLSX.utils.book_append_sheet(workbook, recapSheet, "Rekap");

  const habit = habitTable(data);
  const habitSheet = XLSX.utils.aoa_to_sheet([
    [`Berapa kali tiap kebiasaan "selesai" (jurnal terkirim/disetujui)`],
    [],
    habit.header,
    ...habit.rows,
  ]);
  XLSX.utils.book_append_sheet(workbook, habitSheet, "7 Kebiasaan");

  XLSX.writeFile(workbook, fileName(data, "xlsx"));
}

async function buildPdf(data: GuruWaliRecap) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  const lines = metaLines(data);
  doc.setFontSize(14);
  doc.text(lines[0], 14, 15);
  doc.setFontSize(12);
  doc.text(lines[1], 14, 22);
  doc.setFontSize(10);
  doc.text(lines[2], 14, 29);
  doc.text(lines[3], 14, 35);

  autoTable(doc, {
    startY: 40,
    head: [RECAP_HEADER],
    body: recapRows(data),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  const habit = habitTable(data);
  const afterRecap = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY;
  doc.setFontSize(11);
  doc.text('Rekap 7 Kebiasaan — berapa kali "selesai"', 14, afterRecap + 10);
  autoTable(doc, {
    startY: afterRecap + 14,
    head: [habit.header],
    body: habit.rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(fileName(data, "pdf"));
}

export function DownloadGuruWaliReport() {
  const [month, setMonth] = useState(() => todayWIB().slice(0, 7));
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(format: "xlsx" | "pdf") {
    setBusy(format);
    setError(null);
    try {
      const { from, to } = periodRange(month);
      const data = await getGuruWaliRecap(from, to);
      if (data.students.length === 0) {
        setError("Tidak ada siswa binaan aktif untuk dilaporkan.");
        return;
      }
      if (format === "xlsx") buildExcel(data);
      else await buildPdf(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data laporan");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="mb-1 text-base font-semibold">Unduh Laporan</h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Rekap jurnal seluruh siswa binaan Anda pada satu bulan: jumlah jurnal per
        status, hari tanpa jurnal, rata-rata nilai karakter, dan rekap 7 Kebiasaan.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Bulan{" "}
          <input
            type="month"
            value={month}
            max={todayWIB().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
            className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <button
          onClick={() => handleDownload("xlsx")}
          disabled={busy !== null || !month}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "xlsx" ? "Menyiapkan…" : "Unduh Excel"}
        </button>
        <button
          onClick={() => handleDownload("pdf")}
          disabled={busy !== null || !month}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {busy === "pdf" ? "Menyiapkan…" : "Unduh PDF"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
