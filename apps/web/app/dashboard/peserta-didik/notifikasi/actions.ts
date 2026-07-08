"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

export async function markAllNotificationsRead() {
  await apiFetch("/notifications/read-all", { method: "PATCH" });
  // Revalidasi layout agar badge jumlah belum-dibaca di nav ikut ter-reset.
  revalidatePath("/dashboard/peserta-didik", "layout");
}
