"use client";

import { useState, useTransition } from "react";
import { changeOwnPassword } from "@/app/dashboard/profil/actions";

/**
 * Form ganti kata sandi mandiri (Fase 9). Dipakai semua peran dari halaman
 * /dashboard/profil. Validasi ringan di sisi klien (panjang minimal &
 * konfirmasi cocok) — validasi sesungguhnya (verifikasi sandi lama) tetap
 * di API.
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("idle");
    setErrorMsg(null);

    if (newPassword.length < 8) {
      setState("error");
      setErrorMsg("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setState("error");
      setErrorMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    startTransition(async () => {
      try {
        await changeOwnPassword({ currentPassword, newPassword });
        setState("done");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Gagal mengganti kata sandi.");
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-900";

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div>
        <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
          Kata sandi lama
        </label>
        <input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">
          Jika belum pernah diganti: guru = NIP, peserta didik = NISN.
        </p>
      </div>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
          Kata sandi baru
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-500">Minimal 8 karakter.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium">
          Ulangi kata sandi baru
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </div>

      {state === "done" && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Kata sandi berhasil diganti. Gunakan kata sandi baru saat login berikutnya.
        </p>
      )}
      {state === "error" && errorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Ganti Kata Sandi"}
      </button>
    </form>
  );
}
