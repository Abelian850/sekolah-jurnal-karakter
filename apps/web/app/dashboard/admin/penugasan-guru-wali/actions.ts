"use server";

import { apiFetch } from "@/lib/api-client";
import { revalidatePath } from "next/cache";

interface TeacherStudentAssignment {
  id: string;
  teacherId: string;
  studentId: string;
  academicYearId: string;
  isActive: boolean;
  assignedAt: string;
  unassignedAt: string | null;
}

export async function lookupCurrentAssignment(
  studentId: string,
  academicYearId: string
): Promise<TeacherStudentAssignment | null> {
  const history = await apiFetch<TeacherStudentAssignment[]>(
    `/teacher-student?studentId=${studentId}`
  );
  return (
    history.find((a) => a.isActive && a.academicYearId === academicYearId) ?? null
  );
}

export async function assignGuruWali(
  teacherId: string,
  studentId: string,
  academicYearId: string
) {
  await apiFetch("/teacher-student", {
    method: "POST",
    body: JSON.stringify({ teacherId, studentId, academicYearId }),
  });
  revalidatePath("/dashboard/admin/penugasan-guru-wali");
}

export interface BulkAssignResult {
  row: number;
  identifier: string;
  success: boolean;
  message?: string;
}

/**
 * Penugasan massal (revisi Juli 2026): satu Guru Wali -> banyak siswa,
 * via multi-select (studentIds) dan/atau daftar NISN (nisns). Laporan
 * per baris; siswa yang sudah punya wali TIDAK dipindahkan (lihat
 * POST /teacher-student/bulk).
 */
export async function bulkAssignGuruWali(input: {
  teacherId: string;
  academicYearId: string;
  studentIds?: string[];
  nisns?: string[];
}): Promise<BulkAssignResult[]> {
  const result = await apiFetch<BulkAssignResult[]>("/teacher-student/bulk", {
    method: "POST",
    body: JSON.stringify(input),
  });
  revalidatePath("/dashboard/admin/penugasan-guru-wali");
  return result;
}
