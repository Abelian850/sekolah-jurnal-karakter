"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

export async function createComment(journalId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await apiFetch(`/children/journals/${journalId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });

  revalidatePath(`/dashboard/orang-tua/jurnal/${journalId}`);
}
