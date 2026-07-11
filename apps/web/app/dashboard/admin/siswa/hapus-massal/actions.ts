"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

export interface BulkDeleteResult {
  row: number;
  nisn: string;
  success: boolean;
  /** Nama siswa saat sukses, atau alasan kegagalan saat gagal. */
  message?: string;
}

/**
 * Hapus banyak peserta didik sekaligus berdasarkan daftar NISN.
 * Sengaja hanya NISN (bukan nama) — nama tidak unik. API memproses per
 * baris: NISN tak ditemukan atau siswa yang sudah punya jurnal dilaporkan
 * gagal tanpa menghentikan baris lain (POST /students/bulk-delete).
 */
export async function bulkDeleteStudents(nisns: string[]): Promise<BulkDeleteResult[]> {
  const results = await apiFetch<BulkDeleteResult[]>("/students/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ nisns }),
  });
  revalidatePath("/dashboard/admin/siswa");
  return results;
}
