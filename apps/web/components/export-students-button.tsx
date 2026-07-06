"use client";

import * as XLSX from "xlsx";

interface Student {
  nis: string;
  nisn: string | null;
  fullName: string;
  className: string;
  gradeLevel: string;
  gender: string | null;
}

/**
 * Export dijalankan sepenuhnya di browser (bukan di Next.js server/edge
 * function) - lihat penjelasan trade-off lengkap di
 * docs/bulk-import-export.md. Data yang sudah diambil server-side
 * (lewat apiFetch di page.tsx) diteruskan sebagai prop, lalu SheetJS
 * membentuk workbook dan memicu unduhan langsung dari klien.
 */
export function ExportStudentsButton({ students }: { students: Student[] }) {
  function handleExport() {
    const rows = students.map((s) => ({
      NIS: s.nis,
      NISN: s.nisn ?? "",
      "Nama Lengkap": s.fullName,
      Kelas: s.className,
      Angkatan: s.gradeLevel,
      "Jenis Kelamin": s.gender ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Peserta Didik");
    XLSX.writeFile(workbook, `peserta-didik-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <button
      onClick={handleExport}
      disabled={students.length === 0}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      Export Excel
    </button>
  );
}
