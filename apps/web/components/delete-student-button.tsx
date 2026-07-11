"use client";

import { useState, useTransition } from "react";
import { deleteStudent } from "@/app/dashboard/admin/siswa/actions";

/**
 * Tombol per-baris di daftar peserta didik: hapus siswa beserta akun
 * login-nya. Untuk mengoreksi salah input. API menolak (409) jika siswa
 * sudah punya jurnal — pesan itu ditampilkan di sini. Pola sama dengan
 * reset-student-password-button.tsx.
 */
export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        `Hapus peserta didik "${studentName}" beserta akun login-nya? Tindakan ini tidak bisa dibatalkan.`
      )
    ) {
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await deleteStudent(studentId);
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
