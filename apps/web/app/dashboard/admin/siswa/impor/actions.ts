"use server";

import { apiFetch } from "@/lib/api-client";

/**
 * Pasca-Fase 6: kolom email & password DIHAPUS dari impor. Akun siswa
 * dibuat otomatis oleh API dengan username & kata sandi awal = NISN.
 */
export interface StudentImportRow {
  nis: string;
  nisn: string;
  fullName: string;
  className: string;
  /** Opsional - jika kosong, API menurunkannya dari kata pertama className. */
  gradeLevel?: string;
  gender?: "L" | "P";
  birthDate?: string;
}

export interface BulkImportResult {
  row: number;
  success: boolean;
  message?: string;
}

export async function bulkImportStudents(
  schoolId: string,
  rows: StudentImportRow[]
): Promise<BulkImportResult[]> {
  return apiFetch<BulkImportResult[]>("/students/bulk", {
    method: "POST",
    body: JSON.stringify({ schoolId, rows }),
  });
}
