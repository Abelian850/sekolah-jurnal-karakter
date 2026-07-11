"use client";

import { useState, useTransition } from "react";
import { resetTeacherPassword } from "@/app/dashboard/admin/guru/actions";

/**
 * Tombol per-baris di daftar guru: reset kata sandi kembali ke NIP.
 * Dipakai untuk guru lama (dibuat sebelum konvensi login-NIP) atau guru
 * yang lupa kata sandi. Pola sama dengan reset-student-password-button.tsx.
 */
export function ResetTeacherPasswordButton({
  teacherId,
  teacherName,
  nip,
}: {
  teacherId: string;
  teacherName: string;
  nip: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!nip) {
    return <span className="text-xs text-slate-400">NIP belum diisi</span>;
  }

  function handleClick() {
    if (
      !window.confirm(
        `Reset kata sandi ${teacherName} menjadi NIP-nya (${nip})? Kata sandi lama tidak berlaku lagi.`
      )
    ) {
      return;
    }
    setState("idle");
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await resetTeacherPassword(teacherId);
        setState("done");
      } catch (err) {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Gagal mereset.");
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        {isPending ? "Mereset..." : "Reset sandi ke NIP"}
      </button>
      {state === "done" && <span className="text-xs text-green-600">Berhasil</span>}
      {state === "error" && <span className="text-xs text-red-600">{errorMsg}</span>}
    </span>
  );
}
