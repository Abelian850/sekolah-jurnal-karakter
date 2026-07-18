"use server";

import { apiFetch } from "@/lib/api-client";

/**
 * Ganti kata sandi mandiri (semua peran). Verifikasi sandi lama dilakukan
 * di API (PATCH /me/password) — error dari API (mis. "Kata sandi lama
 * salah") dilempar apiFetch sebagai ApiRequestError dan diteruskan ke form.
 */
export async function changeOwnPassword(params: {
  currentPassword: string;
  newPassword: string;
}) {
  await apiFetch("/me/password", {
    method: "PATCH",
    body: JSON.stringify(params),
  });
}
