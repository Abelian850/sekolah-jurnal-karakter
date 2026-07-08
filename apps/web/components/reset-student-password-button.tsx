"use client";

import { useState, useTransition } from "react";
import { resetStudentPassword } from "@/app/dashboard/admin/siswa/actions";

/**
 * Tombol per-baris di daftar siswa: reset kata sandi kembali ke NISN.
 * Dipakai untuk siswa lama (dibuat sebelum konvensi login-NISN) atau siswa
 * yang lupa kata sandi.
 */
export function ResetStudentPasswordButton({
  studentId,
  studentName,
  nisn,
}: {
  studentId: string;
  studentName: string;
  nisn: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!nisn) {
    return <span className="text-xs text-slate-400">NISN belum diisi</span>;
  }

  function handleClick() {
    if (
      !window.confirm(
        `Reset kata sandi ${studentName} menjadi NISN-nya (${nisn})? Kata sandi lama tidak berlaku lagi.`
      )
    ) {
      return;
    }
    setState("idle");
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await resetStudentPassword(studentId);
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
        {isPending ? "Mereset..." : "Reset sandi ke NISN"}
      </button>
      {state === "done" && <span className="text-xs text-green-600">Berhasil</span>}
      {state === "error" && <span className="text-xs text-red-600">{errorMsg}</span>}
    </span>
  );
}
