"use client";

import { useState, useTransition } from "react";
import {
  verifyJournal,
  type VerifyJournalPayload,
} from "@/app/dashboard/guru-wali/verifikasi/[id]/actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80";

const STATUS_OPTIONS: Array<{
  value: VerifyJournalPayload["status"];
  label: string;
  description: string;
}> = [
  {
    value: "disetujui",
    label: "Setujui",
    description: "Jurnal benar dan lengkap. Beri nilai karakter 1-100.",
  },
  {
    value: "revisi",
    label: "Minta Revisi",
    description: "Ada yang perlu diperbaiki - jurnal dikembalikan ke siswa untuk dikirim ulang.",
  },
  {
    value: "ditolak",
    label: "Tolak",
    description: "Jurnal tidak dapat diterima (final, siswa tidak bisa mengubahnya lagi).",
  },
];

const CONFIRM_MESSAGES: Record<VerifyJournalPayload["status"], string> = {
  disetujui: "Setujui jurnal ini? Keputusan ini final.",
  revisi: "Kembalikan jurnal ini ke siswa untuk diperbaiki?",
  ditolak: "Tolak jurnal ini? Keputusan ini final dan siswa tidak bisa memperbaikinya.",
};

/**
 * Form verifikasi jurnal oleh Guru Wali. Validasi di sini hanya untuk UX -
 * aturan sesungguhnya (nilai wajib saat setuju, catatan wajib saat
 * tolak/revisi) ditegakkan lagi oleh zod di backend.
 */
export function VerificationForm({ journalId }: { journalId: string }) {
  const [status, setStatus] = useState<VerifyJournalPayload["status"]>("disetujui");
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);

    const parsedScore = Number(score);
    if (status === "disetujui" && (!score || parsedScore < 1 || parsedScore > 100)) {
      setError("Nilai karakter wajib diisi (1-100) saat menyetujui jurnal.");
      return;
    }
    if (status !== "disetujui" && !note.trim()) {
      setError("Catatan wajib diisi saat menolak atau meminta revisi.");
      return;
    }
    if (!window.confirm(CONFIRM_MESSAGES[status])) return;

    startTransition(async () => {
      try {
        await verifyJournal(journalId, {
          status,
          note: note.trim() || null,
          characterScore: status === "disetujui" ? parsedScore : null,
        });
      } catch (err) {
        // redirect() dari server action dilempar sebagai error khusus Next -
        // jangan ditangkap sebagai kegagalan.
        if (err && typeof err === "object" && "digest" in err) throw err;
        setError(err instanceof Error ? err.message : "Gagal menyimpan verifikasi.");
      }
    });
  }

  return (
    <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
      <h2 className="mb-3 text-sm font-semibold">Keputusan Verifikasi</h2>

      <div className="mb-4 flex flex-col gap-2">
        {STATUS_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
              status === o.value
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-900/10"
                : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
            }`}
          >
            <input
              type="radio"
              name="verification-status"
              value={o.value}
              checked={status === o.value}
              onChange={() => setStatus(o.value)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{o.label}</span>
              <span className="block text-xs text-slate-500">{o.description}</span>
            </span>
          </label>
        ))}
      </div>

      {status === "disetujui" && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Nilai Karakter (1-100)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="contoh: 85"
            className={`${inputClass} w-32`}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">
          Catatan {status === "disetujui" ? "(opsional)" : "(wajib)"}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={
            status === "disetujui"
              ? "Apresiasi atau masukan untuk siswa..."
              : "Jelaskan apa yang perlu diperbaiki/alasan penolakan..."
          }
          className={inputClass}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan Verifikasi"}
      </button>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
