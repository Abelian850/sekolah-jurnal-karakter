"use client";

import { useState, useTransition } from "react";
import { deleteTeacher } from "@/app/dashboard/admin/guru/actions";

/**
 * Tombol per-baris di daftar guru: hapus guru beserta akun login-nya.
 * Untuk mengoreksi salah input. API menolak (409) jika guru masih punya
 * penugasan wali atau riwayat penilaian — pesan itu ditampilkan di sini.
 * Pola sama dengan reset-teacher-password-button.tsx.
 */
export function DeleteTeacherButton({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `Hapus guru "${teacherName}" beserta akun login-nya? Tindakan ini tidak bisa dibatalkan.`
      )
    ) {
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await deleteTeacher(teacherId);
        // Sukses: daftar otomatis diperbarui via revalidatePath di server action.
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Gagal menghapus.");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
      >
        {isPending ? "Menghapus..." : "Hapus"}
      </button>
      {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
    </span>
  );
}
