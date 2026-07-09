"use client";

import { useState, useTransition } from "react";
import {
  setEvidenceRequirement,
  clearEvidenceRequirement,
} from "@/app/dashboard/guru-wali/bukti-harian/actions";

export interface TemplateItemOption {
  id: string;
  itemName: string;
  itemType: string;
  orderIndex: number;
}

/**
 * Form pemilihan kebiasaan wajib berbukti foto untuk satu tanggal.
 * Pola useTransition + server action mengikuti journal-items-form.tsx.
 */
export function EvidenceRequirementForm({
  date,
  templateItems,
  currentTemplateItemId,
}: {
  date: string;
  templateItems: TemplateItemOption[];
  currentTemplateItemId: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(currentTemplateItemId);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!selected) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await setEvidenceRequirement(date, selected);
        setMessage("Tersimpan. Berlaku untuk semua siswa binaan Anda pada tanggal ini.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      }
    });
  }

  function handleClear() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await clearEvidenceRequirement(date);
        setSelected(null);
        setMessage(
          "Pilihan dihapus. Siswa tetap wajib melampirkan satu foto, pada kebiasaan mana pun."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menghapus.");
      }
    });
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {templateItems.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-3 py-3">
              <input
                type="radio"
                name="evidence-item"
                checked={selected === item.id}
                onChange={() => setSelected(item.id)}
                className="h-4 w-4 accent-brand-600"
              />
              <span className="text-sm font-medium">{item.itemName}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          onClick={handleSave}
          disabled={isPending || !selected}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {isPending ? "Menyimpan..." : "Simpan Pilihan"}
        </button>
        {currentTemplateItemId && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Hapus Pilihan
          </button>
        )}
      </div>

      {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
