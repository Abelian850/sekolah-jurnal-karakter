import { auth } from "./auth";
import { mintApiToken } from "./api-token";
import type { ApiErrorBody, ApiSuccessBody } from "@sjk/shared";

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Wrapper fetch ke backend Hono, dipakai dari Server Component & Server
 * Action di apps/web. Selalu mengambil sesi Auth.js terkini, mint token
 * API baru (lihat lib/api-token.ts), lalu kirim sebagai Bearer token.
 *
 * Sengaja TIDAK di-cache/reuse token antar request, karena token berumur
 * pendek (5 menit) dan minting ulang murah (hanya operasi kriptografi lokal,
 * tidak ada round-trip jaringan tambahan).
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();

  if (!session?.user) {
    throw new ApiRequestError(401, "Belum login");
  }

  const token = await mintApiToken({
    sub: session.user.id,
    email: session.user.email,
    role: session.user.role,
    schoolId: session.user.schoolId,
  });

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody;

  if (!res.ok) {
    const errBody = body as ApiErrorBody;
    throw new ApiRequestError(res.status, errBody.message ?? "Terjadi kesalahan pada API");
  }

  return (body as ApiSuccessBody<T>).data;
}

/**
 * Varian apiFetch untuk unggah file (multipart/form-data). Content-Type
 * sengaja TIDAK di-set manual - fetch menyusunnya sendiri lengkap dengan
 * boundary multipart. Selebihnya identik dengan apiFetch.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const session = await auth();

  if (!session?.user) {
    throw new ApiRequestError(401, "Belum login");
  }

  const token = await mintApiToken({
    sub: session.user.id,
    email: session.user.email,
    role: session.user.role,
    schoolId: session.user.schoolId,
  });

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "POST",
    body: formData,
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const body = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody;

  if (!res.ok) {
    const errBody = body as ApiErrorBody;
    throw new ApiRequestError(res.status, errBody.message ?? "Terjadi kesalahan pada API");
  }

  return (body as ApiSuccessBody<T>).data;
}
