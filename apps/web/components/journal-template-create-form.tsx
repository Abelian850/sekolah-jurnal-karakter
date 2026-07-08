"use client";

import { useState, useTransition } from "react";
import {
  createJournalTemplate,
  type NewTemplateItem,
} from "@/app/dashboard/admin/jurnal-template/baru/actions";

interface School {
  id: string;
  name: string;
}

const ITEM_TYPES: Array<{ value: NewTemplateItem["itemType"]; label: string }> = [
  { value: "checklist", label: "Checklist (selesai/belum/sebagian)" },
  { value: "waktu", label: "Waktu (jam pelaksanaan)" },
  { value: "catatan", label: "Catatan (teks bebas)" },
  { value: "foto", label: "Foto (tautan URL)" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80";

export function JournalTemplateCreateForm({ schools }: { schools: School[] }) {
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [name, setName] = useState("");
  const [items, setItems] = useState<NewTemplateItem[]>([
    { itemName: "", itemType: "checklist" },
  ]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<NewTemplateItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { itemName: "", itemType: "checklist" }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setError(null);
    const cleaned = items.filter((it) => it.itemName.trim().length > 0);
    if (!schoolId || name.trim().length < 3 || cleaned.length === 0) {
      setError("Isi nama template (min. 3 karakter) dan minimal satu item.");
      return;
    }

    startTransition(async () => {
      try {
        await createJournalTemplate({
          schoolId,
          name: name.trim(),
          items: cleaned.map((it) => ({ itemName: it.itemName.trim(), itemType: it.itemType })),
        });
      } catch (err) {
        // redirect() di server action dilempar sebagai error khusus Next;
        // jangan ditelan sebagai pesan kesalahan.
        if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
        setError(err instanceof Error ? err.message : "Gagal menyimpan template.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Sekolah</label>
        <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={inputClass}>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nama Template</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Jurnal Karakter Harian 2026/2027"
          className={inputClass}
        />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Item Jurnal</p>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item.itemName}
                onChange={(e) => updateItem(i, { itemName: e.target.value })}
                placeholder={`Item ${i + 1}, contoh: Sholat Subuh`}
                className={inputClass}
              />
              <select
                value={item.itemType}
                onChange={(e) =>
                  updateItem(i, { itemType: e.target.value as NewTemplateItem["itemType"] })
                }
                className={`${inputClass} w-56 shrink-0`}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(i)}
                disabled={items.length === 1}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={`Hapus item ${i + 1}`}
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          + Tambah Item
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {isPending ? "Menyimpan..." : "Simpan Template"}
      </button>
    </div>
  );
}
