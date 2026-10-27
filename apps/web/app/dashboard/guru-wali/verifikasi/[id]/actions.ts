"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export interface VerifyJournalPayload {
  status: "disetujui" | "ditolak" | "revisi";
  note?: string | null;
  characterScore?: number | null;
}

export async function verifyJournal(journalId: string, payload: VerifyJournalPayload) {
  await apiFetch(`/verifications/journals/${journalId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  revalidatePath("/dashboard/guru-wali");
  revalidatePath("/dashboard/guru-wali/riwayat");
  redirect("/dashboard/guru-wali");
}
