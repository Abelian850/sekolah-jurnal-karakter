"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

/** Reset kata sandi siswa kembali ke NISN-nya (lihat API reset-password). */
export async function resetStudentPassword(studentId: string) {
  await apiFetch(`/students/${studentId}/reset-password`, { method: "PATCH" });
}

/**
 * Hapus peserta didik beserta akun login-nya. API menolak (409) jika siswa
 * sudah punya jurnal; pesan error diteruskan ke tombol.
 */
export async function deleteStudent(studentId: string) {
  await apiFetch(`/students/${studentId}`, { method: "DELETE" });
  revalidatePath("/dashboard/admin/siswa");
}
