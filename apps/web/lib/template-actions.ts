"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

/**
 * Server actions template jurnal BERSAMA untuk dua dashboard (revisi Juli
 * 2026): Admin (/dashboard/admin/jurnal-template) dan Guru Wali
 * (/dashboard/guru-wali/template). Semua action menerima `basePath` sebagai
 * argumen bind pertama supaya revalidate/redirect kembali ke dashboard yang
 * benar; otorisasi & scoping sekolah tetap di API (journal-templates.ts).
 */

export interface NewTemplateItem {
  itemName: string;
  itemType: "checklist" | "waktu" | "catatan" | "foto";
  description?: string;
  requiresPhoto: boolean;
}

export interface CreateTemplateInput {
  /** Wajib untuk Admin; Guru Wali dipaksa ke sekolahnya sendiri oleh API. */
  schoolId?: string;
  name: string;
  items: NewTemplateItem[];
}

function revalidateDetail(basePath: string, id: string) {
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function createJournalTemplate(basePath: string, input: CreateTemplateInput) {
  await apiFetch("/journal-templates", {
    method: "POST",
    body: JSON.stringify(input),
  });

  revalidatePath(basePath);
  redirect(basePath);
}

export async function renameTemplate(basePath: string, id: string, formData: FormData) {
  await apiFetch(`/journal-templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name: formData.get("name") }),
  });
  revalidateDetail(basePath, id);
}

export async function activateTemplate(basePath: string, id: string) {
  await apiFetch(`/journal-templates/${id}/activate`, { method: "PATCH" });
  revalidateDetail(basePath, id);
}

export async function addTemplateItem(basePath: string, id: string, formData: FormData) {
  await apiFetch(`/journal-templates/${id}/items`, {
    method: "POST",
    body: JSON.stringify({
      itemName: formData.get("itemName"),
      itemType: formData.get("itemType"),
      description: formData.get("description") || undefined,
      requiresPhoto: formData.get("requiresPhoto") === "on",
    }),
  });
  revalidateDetail(basePath, id);
}

/** Toggle penanda butuh bukti foto pada satu item. */
export async function setItemRequiresPhoto(
  basePath: string,
  id: string,
  itemId: string,
  requiresPhoto: boolean
) {
  await apiFetch(`/journal-templates/${id}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ requiresPhoto }),
  });
  revalidateDetail(basePath, id);
}

export async function updateItemDescription(
  basePath: string,
  id: string,
  itemId: string,
  formData: FormData
) {
  await apiFetch(`/journal-templates/${id}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ description: (formData.get("description") as string) || null }),
  });
  revalidateDetail(basePath, id);
}

export async function deleteTemplateItem(basePath: string, id: string, itemId: string) {
  await apiFetch(`/journal-templates/${id}/items/${itemId}`, { method: "DELETE" });
  revalidateDetail(basePath, id);
}

export async function deleteTemplate(basePath: string, id: string) {
  await apiFetch(`/journal-templates/${id}`, { method: "DELETE" });
  revalidatePath(basePath);
  redirect(basePath);
}
