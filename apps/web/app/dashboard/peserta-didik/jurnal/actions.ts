"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, apiUpload, ApiRequestError } from "@/lib/api-client";
import { getTodayDateWIB } from "@/lib/date";

export async function createTodayJournal() {
  try {
    await apiFetch("/journals", {
      method: "POST",
      body: JSON.stringify({ journalDate: getTodayDateWIB() }),
    });
  } catch (err) {
    // Error konfigurasi (mis. belum ada tahun ajaran/semester/template aktif,
    // 409 dari resolveActiveSemesterAndTemplate) ditampilkan sebagai pesan di
    // halaman, bukan runtime error. redirect() melempar NEXT_REDIRECT sehingga
    // aman dipanggil di dalam catch ini.
    if (err instanceof ApiRequestError) {
      redirect(
        `/dashboard/peserta-didik/jurnal?error=${encodeURIComponent(err.message)}`
      );
    }
    throw err;
  }
  revalidatePath("/dashboard/peserta-didik/jurnal");
}

export interface UpdateJournalItemPayload {
  // "sebagian" dihapus dari isian baru (revisi Juli 2026 tahap 2).
  status?: "selesai" | "belum";
  recordedTime?: string | null;
  note?: string | null;
  photoUrl?: string | null;
  /** Jawaban model formulir per kebiasaan (HABIT_QUESTION_SETS di @sjk/shared). */
  answers?: Record<string, string> | null;
}

export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * Error dikembalikan sebagai nilai, bukan dilempar: di production Next.js
 * menyembunyikan pesan error server action, jadi pesan API (mis. validasi)
 * tak akan sampai ke murid.
 */
async function toResult(run: () => Promise<unknown>, fallback: string): Promise<ActionResult> {
  try {
    await run();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : fallback };
  }
}

/**
 * Sengaja TANPA revalidatePath: revalidatePath di server action membuat
 * Worker yang sama merender ulang seluruh halaman jurnal di setiap klik
 * Simpan (rawan melewati batas CPU Cloudflare Workers). Form sudah melacak
 * nilai tersimpan di state klien, dan halaman ini dinamis sehingga selalu
 * mengambil data baru saat dibuka lagi.
 */
export async function updateJournalItem(
  journalId: string,
  itemId: string,
  payload: UpdateJournalItemPayload
): Promise<ActionResult> {
  return toResult(
    () =>
      apiFetch(`/journals/${journalId}/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    "Gagal menyimpan."
  );
}

/** Tanpa revalidatePath - klien memanggil router.refresh() sebagai request terpisah. */
export async function submitJournal(journalId: string): Promise<ActionResult> {
  return toResult(
    () => apiFetch(`/journals/${journalId}/submit`, { method: "PATCH" }),
    "Gagal mengirim jurnal."
  );
}

/**
 * Unggah foto bukti (sudah dikompres di browser) ke R2 lewat API.
 * Mengembalikan path relatif ("/api/foto/journal/...") untuk diisikan ke
 * photoUrl item jurnal - penyimpanan ke item tetap lewat updateJournalItem.
 */
export async function uploadJournalPhoto(formData: FormData): Promise<string> {
  const { path } = await apiUpload<{ path: string }>("/files/journal-photo", formData);
  return path;
}
