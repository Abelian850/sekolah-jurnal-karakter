"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

/** Reset kata sandi guru kembali ke NIP-nya (lihat API reset-password). */
export async function resetTeacherPassword(teacherId: string) {
  await apiFetch(`/teachers/${teacherId}/reset-password`, { method: "PATCH" });
}

/**
 * Hapus guru beserta akun login-nya. API menolak (409) jika guru masih punya
 * penugasan wali atau riwayat penilaian; pesan error diteruskan ke tombol.
 */
export async function deleteTeacher(teacherId: string) {
  await apiFetch(`/teachers/${teacherId}`, { method: "DELETE" });
  revalidatePath("/dashboard/admin/guru");
}
