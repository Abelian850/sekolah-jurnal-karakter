"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

/**
 * Server actions fitur Kelulusan & Kenaikan Kelas (lihat
 * docs/catatan-sesi-2026-07-11.md). Data alumni TIDAK dihapus — kelulusan
 * hanya menonaktifkan siswa + akun login + penugasan wali. Urutan tiap
 * tahun ajaran baru: kelulusan dulu, baru kenaikan kelas.
 */

export interface GraduateResult {
  row: number;
  nisn: string | null;
  fullName: string;
  success: boolean;
  message?: string;
}

export interface PromoteResult extends GraduateResult {
  from: string;
  to: string;
}

export interface ClassMapping {
  fromClassName: string;
  toClassName: string;
  toGradeLevel: string;
}

export async function graduateBulk(input: {
  schoolId: string;
  gradeLevel: string;
  excludeStudentIds?: string[];
}): Promise<{ results: GraduateResult[]; excludedCount: number }> {
  const data = await apiFetch<{ results: GraduateResult[]; excludedCount: number }>(
    "/students/graduate-bulk",
    { method: "POST", body: JSON.stringify(input) }
  );
  revalidatePath("/dashboard/admin/siswa");
  revalidatePath("/dashboard/admin/kelulusan-kenaikan");
  return data;
}

export async function promoteBulk(input: {
  schoolId: string;
  mappings: ClassMapping[];
  excludeStudentIds?: string[];
}): Promise<{ results: PromoteResult[]; excludedCount: number }> {
  const data = await apiFetch<{ results: PromoteResult[]; excludedCount: number }>(
    "/students/promote-bulk",
    { method: "POST", body: JSON.stringify(input) }
  );
  revalidatePath("/dashboard/admin/siswa");
  revalidatePath("/dashboard/admin/kelulusan-kenaikan");
  return data;
}
