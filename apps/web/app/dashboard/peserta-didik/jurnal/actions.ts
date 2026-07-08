"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { getTodayDateWIB } from "@/lib/date";

export async function createTodayJournal() {
  await apiFetch("/journals", {
    method: "POST",
    body: JSON.stringify({ journalDate: getTodayDateWIB() }),
  });
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
