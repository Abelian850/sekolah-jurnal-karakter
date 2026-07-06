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
