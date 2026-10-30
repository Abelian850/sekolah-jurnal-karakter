"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveAllPending } from "@/app/dashboard/guru-wali/verifikasi-actions";

/** Pengaman loop: 50 x 100 jurnal per panggilan = 5.000 jurnal. */
const MAX_ROUNDS = 50;

/**
 * Tombol "Setujui Semua" di dashboard Guru Wali. Menyetujui seluruh jurnal
 * murid perwalian yang menunggu verifikasi - nilai karakter tetap dihitung
 * otomatis per jurnal oleh server, notifikasi tetap terkirim per jurnal.
 *
 * API memproses per 100 jurnal, jadi tombol ini memanggil ulang sampai sisa
 * 0. Berhenti juga bila satu putaran tidak menyetujui apa pun (mis. jurnal
 * sudah diproses dari tab lain) agar tidak berputar tanpa akhir.
 */
export function ApproveAllButton({ count }: { count: number }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [approved, setApproved] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok = window.confirm(
      `Setujui SEMUA ${count} jurnal yang menunggu verifikasi?\n\n` +
        "- Nilai karakter dihitung otomatis per jurnal.\n" +
        "- Keputusan ini FINAL dan tidak bisa dibatalkan.\n" +
        "- Isian & foto bukti tidak Anda periksa satu per satu.\n\n" +
        "Jurnal yang perlu revisi atau ditolak sebaiknya diperiksa manual dulu."
    );
    if (!ok) return;

    setRunning(true);
    setFinished(false);
    setError(null);
    setApproved(0);

    let total = 0;
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const result = await approveAllPending();
        if (!result.ok) {
          setError(result.message);
          break;
        }
        total += result.approved;
        setApproved(total);
        if (result.remaining === 0 || result.approved === 0) break;
      }
    } catch {
      setError(
        "Koneksi terputus. Sebagian jurnal mungkin sudah disetujui — muat ulang halaman untuk melihat sisanya."
      );
    } finally {
      setRunning(false);
      setFinished(true);
      // Dashboard dinamis: refresh mengambil ulang daftar & statistik.
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={running}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 disabled:opacity-60"
      >
        {running ? `Menyetujui... (${approved}/${count})` : `Setujui Semua (${count})`}
      </button>
      {finished && !error && <p className="text-xs text-green-600">{approved} jurnal disetujui.</p>}
      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">
          {approved > 0 ? `${approved} jurnal sempat disetujui. ` : ""}
          {error}
        </p>
      )}
    </div>
  );
}
