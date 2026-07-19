"use server";

import { apiFetch } from "@/lib/api-client";

/**
 * Server action pengambil data rekap laporan Guru Wali (rencana kerja
 * 19 Juli, Prioritas 1). Hanya MENGAMBIL data — file Excel/PDF digenerate
 * DI BROWSER oleh components/download-guru-wali-report.tsx (Workers tidak
 * cocok menggenerate file biner, lihat docs/bulk-import-export.md).
 * Scoping siswa binaan terjadi di API (JWT -> teachers -> teacher_student).
 */

export interface RecapStudent {
  studentId: string;
  fullName: string;
  nisn: string | null;
  className: string;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  daysWithoutJournal: number;
  avgScore: number | null;
}

export interface GuruWaliRecap {
  meta: {
    schoolName: string;
    teacherName: string;
    from: string;
    to: string;
    totalDays: number;
  };
  students: RecapStudent[];
  habits: { templateItemId: string; itemName: string; orderIndex: number }[];
  habitCounts: { studentId: string; templateItemId: string; selesai: number }[];
}

export async function getGuruWaliRecap(from: string, to: string): Promise<GuruWaliRecap> {
  return apiFetch<GuruWaliRecap>(
    `/analytics/guru-wali-recap?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}
