"use server";

import { apiFetch } from "@/lib/api-client";

/** Reset kata sandi guru kembali ke NIP-nya (lihat API reset-password). */
export async function resetTeacherPassword(teacherId: string) {
  await apiFetch(`/teachers/${teacherId}/reset-password`, { method: "PATCH" });
}
