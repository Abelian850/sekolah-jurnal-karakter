"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
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
  status?: "selesai" | "belum" | "sebagian";
  recordedTime?: string | null;
  note?: string | null;
  photoUrl?: string | null;
}

export async function updateJournalItem(
  journalId: string,
  itemId: string,
  payload: UpdateJournalItemPayload
) {
  await apiFetch(`/journals/${journalId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  revalidatePath("/dashboard/peserta-didik/jurnal");
}

export async function submitJournal(journalId: string) {
  await apiFetch(`/journals/${journalId}/submit`, { method: "PATCH" });
  revalidatePath("/dashboard/peserta-didik/jurnal");
  revalidatePath("/dashboard/peserta-didik/riwayat");
}
