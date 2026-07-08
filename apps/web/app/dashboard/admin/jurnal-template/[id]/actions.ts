"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

function revalidateDetail(id: string) {
  revalidatePath("/dashboard/admin/jurnal-template");
  revalidatePath(`/dashboard/admin/jurnal-template/${id}`);
}

export async function renameTemplate(id: string, formData: FormData) {
  await apiFetch(`/journal-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: formData.get("name") }),
  });
  revalidateDetail(id);
}

export async function activateTemplate(id: string) {
  await apiFetch(`/journal-templates/${id}/activate`, { method: "PATCH" });
  revalidateDetail(id);
}

export async function addTemplateItem(id: string, formData: FormData) {
  await apiFetch(`/journal-templates/${id}/items`, {
    method: "POST",
    body: JSON.stringify({
      itemName: formData.get("itemName"),
      itemType: formData.get("itemType"),
    }),
  });
  revalidateDetail(id);
}

export async function deleteTemplateItem(id: string, itemId: string) {
  await apiFetch(`/journal-templates/${id}/items/${itemId}`, { method: "DELETE" });
  revalidateDetail(id);
}

export async function deleteTemplate(id: string) {
  await apiFetch(`/journal-templates/${id}`, { method: "DELETE" });
  revalidatePath("/dashboard/admin/jurnal-template");
  redirect("/dashboard/admin/jurnal-template");
}
