"use server";

import { apiFetch } from "@/lib/api-client";

/** Reset kata sandi siswa kembali ke NISN-nya (lihat API reset-password). */
export async function resetStudentPassword(studentId: string) {
  await apiFetch(`/students/${studentId}/reset-password`, { method: "PATCH" });
}
