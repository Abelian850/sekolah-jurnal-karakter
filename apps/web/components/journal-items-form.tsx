"use client";

import { useState, useTransition } from "react";
import {
  updateJournalItem,
  submitJournal,
  type UpdateJournalItemPayload,
} from "@/app/dashboard/peserta-didik/jurnal/actions";
import type { JournalItemData } from "@/components/journal-items-view";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80";

const STATUS_OPTIONS = [
  { value: "belum", label: "Belum" },
  { value: "sebagian", label: "Sebagian" },
  { value: "selesai", label: "Selesai" },
] as const;

/**
 * Form pengisian jurnal per item. Setiap baris menyimpan dirinya sendiri
 * lewat server action (pola useTransition seperti assign-guru-wali-form.tsx,
 * bukan <form action>, karena input berupa array dinamis mengikuti item
 * template).
 */
function ItemRow({ journalId, item }: { journalId: string; item: JournalItemData }) {
  const [status, setStatus] = useState<JournalItemData["status"]>(item.status);
  const [recordedTime, setRecordedTime] = useState(item.recordedTime?.slice(0, 5) ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [photoUrl, setPhotoUrl] = useState(item.photoUrl ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setSaved(false);
    setError(null);

    const payload: UpdateJournalItemPayload = {};
    if (item.itemType === "checklist") {
      payload.status = status;
    } else if (item.itemType === "waktu") {
      payload.status = status;
      payload.recordedTime = recordedTime || null;
    } else if (item.itemType === "catatan") {
      payload.note = note.trim() || null;
      payload.status = note.trim() ? "selesai" : "belum";
    } else if (item.itemType === "foto") {
      payload.photoUrl = photoUrl.trim() || null;
      payload.status = photoUrl.trim() ? "selesai" : "belum";
    }

    startTransition(async () => {
      try {
        await updateJournalItem(journalId, item.id, payload);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 py-4">
      <p className="text-sm font-medium">{item.itemName}</p>

      <div className="flex flex-wrap items-center gap-2">
        {(item.itemType === "checklist" || item.itemType === "waktu") && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as JournalItemData["status"])}
            className={`${inputClass} w-36`}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        {item.itemType === "waktu" && (
          <input
            type="time"
            value={recordedTime}
            onChange={(e) => setRecordedTime(e.target.value)}
            className={`${inputClass} w-32`}
          />
        )}

        {item.itemType === "catatan" && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Tulis catatanmu di sini..."
            className={inputClass}
          />
        )}

        {item.itemType === "foto" && (
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Tempel tautan (URL) foto di sini"
            className={inputClass}
          />
        )}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {isPending ? "Menyimpan..." : "Simpan"}
        </button>

        {saved && <span className="text-xs text-green-600">Tersimpan</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </li>
  );
}

export function JournalItemsForm({
  journalId,
  items,
}: {
  journalId: string;
  items: JournalItemData[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!window.confirm("Kirim jurnal hari ini? Setelah dikirim, isian tidak bisa diubah lagi.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await submitJournal(journalId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengirim jurnal.");
      }
    });
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <ItemRow key={item.id} journalId={journalId} item={item} />
        ))}
      </ul>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {isPending ? "Mengirim..." : "Kirim Jurnal"}
        </button>
        <p className="text-xs text-slate-500">
          Pastikan setiap item sudah disimpan sebelum mengirim.
        </p>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
