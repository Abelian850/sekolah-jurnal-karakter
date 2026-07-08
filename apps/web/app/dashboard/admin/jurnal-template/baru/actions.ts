"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

export interface NewTemplateItem {
  itemName: string;
  itemType: "checklist" | "waktu" | "catatan" | "foto";
}

export async function createJournalTemplate(input: {
  schoolId: string;
  name: string;
  items: NewTemplateItem[];
}) {
  await apiFetch("/journal-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });

  revalidatePath("/dashboard/admin/jurnal-template");
  redirect("/dashboard/admin/jurnal-template");
}
