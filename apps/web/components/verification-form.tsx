"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    description:
      "Jurnal benar dan lengkap. Nilai karakter dihitung otomatis dari kebiasaan yang selesai.",
  },
  {
    value: "revisi",
    label: "Minta Revisi",
    description: "Ada yang perlu diperbaiki - jurnal dikembalikan ke murid untuk dikirim ulang.",
  },
  {
    value: "ditolak",
    label: "Tolak",
    description: "Jurnal tidak dapat diterima (final, murid tidak bisa mengubahnya lagi).",
  },
];

const CONFIRM_MESSAGES: Record<VerifyJournalPayload["status"], string> = {
  disetujui: "Setujui jurnal ini? Keputusan ini final.",
  revisi: "Kembalikan jurnal ini ke murid untuk diperbaiki?",
  ditolak: "Tolak jurnal ini? Keputusan ini final dan murid tidak bisa memperbaikinya.",
};

const UNCERTAIN_MESSAGE =
  "Server lambat merespons. Verifikasi mungkin sudah tersimpan — muat ulang halaman untuk memastikan sebelum mencoba lagi.";

/**
 * Form verifikasi jurnal oleh Guru Wali. Validasi di sini hanya untuk UX -
 * aturan sesungguhnya (catatan wajib saat tolak/revisi) ditegakkan lagi oleh
 * zod di backend. Nilai karakter TIDAK diisi manual — dihitung otomatis oleh
 * server dari kebiasaan yang selesai (revisi Juli 2026).
 */
export function VerificationForm({ journalId }: { journalId: string }) {
  const [status, setStatus] = useState<VerifyJournalPayload["status"]>("disetujui");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function handleSubmit() {
    setError(null);

    if (status !== "disetujui" && !note.trim()) {
      setError("Catatan wajib diisi saat menolak atau meminta revisi.");
      return;
    }
    if (!window.confirm(CONFIRM_MESSAGES[status])) return;

    startTransition(async () => {
      try {
        const result = await verifyJournal(journalId, {
          status,
          note: note.trim() || null,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setSaved(true);
        // Request terpisah dari penyimpanan (lihat komentar di actions.ts).
        // Halaman dashboard dinamis, jadi datanya selalu diambil ulang.
        router.push("/dashboard/guru-wali");
      } catch {
        // Respons terputus (jaringan/Worker) - data bisa jadi sudah tersimpan.
        setError(UNCERTAIN_MESSAGE);
      }
    });
  }

  // Jaring pengaman: jika respons tak kunjung datang, beri tahu guru alih-alih
  // membiarkan tombol macet di "Menyimpan..." tanpa penjelasan.
  useEffect(() => {
    if (!isPending || saved) return;
    const timer = setTimeout(() => setError(UNCERTAIN_MESSAGE), 15_000);
    return () => clearTimeout(timer);
  }, [isPending, saved]);

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
        <p className="mb-4 rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-xs text-slate-600 dark:border-brand-900 dark:bg-brand-900/10 dark:text-slate-400">
          Nilai karakter dihitung otomatis dari proporsi kebiasaan yang selesai —
          Anda tidak perlu mengisi nilai manual. Skalanya 70-100 (semua
          kebiasaan selesai = 100, tidak ada yang selesai = 70).
        </p>
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
              ? "Apresiasi atau masukan untuk murid..."
              : "Jelaskan apa yang perlu diperbaiki/alasan penolakan..."
          }
          className={inputClass}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending || saved}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {saved ? "Tersimpan" : isPending ? "Menyimpan..." : "Simpan Verifikasi"}
      </button>

      {saved && (
        <p className="mt-2 text-sm text-green-600">
          Verifikasi tersimpan. Membuka daftar jurnal&hellip;{" "}
          <Link href="/dashboard/guru-wali" className="underline">
            Buka sekarang
          </Link>
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
