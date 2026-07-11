"use server";

import { apiFetch } from "@/lib/api-client";

/**
 * Pasca-revisi Juli 2026: kolom email & password TIDAK wajib. Akun guru
 * dibuat otomatis oleh API dengan username & kata sandi awal = NIP;
 * email internal "<nip>@guru.internal" dipakai jika kolom email kosong.
 */
export interface TeacherImportRow {
  nip: string;
  fullName: string;
  email?: string;
  phone?: string;
  isGuruWali: boolean;
}

export interface BulkImportResult {
  row: number;
  success: boolean;
  message?: string;
}

export async function bulkImportTeachers(
  schoolId: string,
  rows: TeacherImportRow[]
): Promise<BulkImportResult[]> {
  return apiFetch<BulkImportResult[]>("/teachers/bulk", {
    method: "POST",
    body: JSON.stringify({ schoolId, rows }),
  });
}
