"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

/**
 * Server actions untuk fitur "Bukti Harian" (7 Kebiasaan Anak Indonesia
 * Hebat): Guru Wali menetapkan SATU kebiasaan yang wajib disertai foto
 * bukti untuk semua siswa binaannya pada satu tanggal.
 */

export async function setEvidenceRequirement(date: string, templateItemId: string) {
  await apiFetch("/evidence-requirements", {
    method: "PUT",
    body: JSON.stringify({ date, templateItemId }),
  });
  revalidatePath("/dashboard/guru-wali/bukti-harian");
}

export async function clearEvidenceRequirement(date: string) {
  await apiFetch(`/evidence-requirements?date=${date}`, { method: "DELETE" });
  revalidatePath("/dashboard/guru-wali/bukti-harian");
}
