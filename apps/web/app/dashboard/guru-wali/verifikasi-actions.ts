"use server";

import { apiFetch } from "@/lib/api-client";

export type ApproveAllResult =
  { ok: true; approved: number; remaining: number } | { ok: false; message: string };

/**
 * Setujui sekaligus jurnal murid perwalian yang menunggu verifikasi.
 * Satu panggilan memproses maks 100 jurnal (batas di API); komponen klien
 * memanggil ulang selama `remaining` > 0 - tiap panggilan adalah request
 * Worker terpisah, sehingga batas CPU per request tidak terlampaui.
 *
 * Sama seperti verifikasi/[id]/actions.ts: TANPA redirect()/revalidatePath()
 * (render ulang di Worker yang sama pernah melewati batas CPU), dan error
 * dikembalikan sebagai nilai agar pesan API sampai ke UI di production.
 */
export async function approveAllPending(): Promise<ApproveAllResult> {
  try {
    const data = await apiFetch<{ approved: number; remaining: number }>(
      "/verifications/approve-all",
      { method: "POST", body: "{}" }
    );
    return { ok: true, approved: data.approved, remaining: data.remaining };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal menyetujui jurnal.",
    };
  }
}
