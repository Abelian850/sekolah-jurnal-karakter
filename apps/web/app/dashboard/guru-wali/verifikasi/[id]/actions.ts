"use server";

import { apiFetch } from "@/lib/api-client";

export interface VerifyJournalPayload {
  status: "disetujui" | "ditolak" | "revisi";
  note?: string | null;
  characterScore?: number | null;
}

export type VerifyJournalResult = { ok: true } | { ok: false; message: string };

/**
 * Hanya menyimpan ke API — sengaja TANPA redirect()/revalidatePath().
 * Sebelumnya redirect() membuat Worker yang sama sekaligus merender halaman
 * daftar guru wali; render itu kadang melewati batas CPU Cloudflare Workers
 * sehingga respons terputus (data sudah tersimpan, tapi tombol macet di
 * "Menyimpan..."). Navigasi kini dilakukan klien sebagai request terpisah.
 *
 * Error dikembalikan sebagai nilai, bukan dilempar: di production Next.js
 * menyembunyikan pesan error server action, jadi pesan API tak sampai ke UI.
 */
export async function verifyJournal(
  journalId: string,
  payload: VerifyJournalPayload
): Promise<VerifyJournalResult> {
  try {
    await apiFetch(`/verifications/journals/${journalId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal menyimpan verifikasi.",
    };
  }
}
