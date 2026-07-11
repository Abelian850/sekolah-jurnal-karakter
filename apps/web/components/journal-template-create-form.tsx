"use client";

import { useState, useTransition } from "react";
import { FIXED_JOURNAL_ITEMS } from "@sjk/shared";
import type { CreateTemplateInput, NewTemplateItem } from "@/lib/template-actions";

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

interface FixedRowState {
  requiresPhoto: boolean;
}

/**
 * Form pembuatan template jurnal (revisi Juli 2026), dipakai dua dashboard:
 * - Admin: prop `schools` diisi -> ada pilihan sekolah.
 * - Guru Wali: `schools` kosong/undefined -> tanpa pilihan sekolah, API
 *   mengunci ke sekolah guru sendiri.
 * 7 kebiasaan tetap (FIXED_JOURNAL_ITEMS) selalu ikut terkirim dengan
 * keterangan contohnya dan tidak bisa dihapus; guru hanya memilih item mana
 * yang butuh bukti foto (default). Item tambahan opsional.
 */
export function JournalTemplateCreateForm({
  schools,
  onCreate,
}: {
  schools?: School[];
  onCreate: (input: CreateTemplateInput) => Promise<void>;
}) {
  const [schoolId, setSchoolId] = useState(schools?.[0]?.id ?? "");
  const [name, setName] = useState("");
  const [fixedRows, setFixedRows] = useState<FixedRowState[]>(
    FIXED_JOURNAL_ITEMS.map(() => ({ requiresPhoto: false }))
  );
  const [extraItems, setExtraItems] = useState<NewTemplateItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleFixedPhoto(index: number) {
    setFixedRows((prev) =>
      prev.map((r, i) => (i === index ? { requiresPhoto: !r.requiresPhoto } : r))
    );
  }

  function updateExtra(index: number, patch: Partial<NewTemplateItem>) {
    setExtraItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function addExtraRow() {
    setExtraItems((prev) => [
      ...prev,
      { itemName: "", itemType: "checklist", description: "", requiresPhoto: false },
    ]);
  }

  function removeExtraRow(index: number) {
    setExtraItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setError(null);
    if ((schools && schools.length > 0 && !schoolId) || name.trim().length < 3) {
      setError("Isi nama template (min. 3 karakter).");
      return;
    }

    const items: NewTemplateItem[] = [
      ...FIXED_JOURNAL_ITEMS.map((f, i) => ({
        itemName: f.name,
        itemType: "checklist" as const,
        description: f.description,
        requiresPhoto: fixedRows[i].requiresPhoto,
      })),
      ...extraItems
        .filter((it) => it.itemName.trim().length > 0)
        .map((it) => ({
          itemName: it.itemName.trim(),
          itemType: it.itemType,
          description: it.description?.trim() || undefined,
          requiresPhoto: it.requiresPhoto,
        })),
    ];

    startTransition(async () => {
      try {
        await onCreate({
          ...(schoolId ? { schoolId } : {}),
          name: name.trim(),
          items,
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
      {schools && schools.length > 0 && (
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
      )}

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
        <p className="mb-1 text-sm font-medium">7 Kebiasaan Anak Indonesia Hebat (tetap)</p>
        <p className="mb-2 text-xs text-slate-500">
          Ketujuh kebiasaan ini wajib ada di setiap template dan tidak bisa dihapus. Centang
          &quot;Wajib foto&quot; untuk item yang butuh bukti foto setiap hari (Bukti Harian per
          tanggal tetap diutamakan).
        </p>
        <ul className="flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {FIXED_JOURNAL_ITEMS.map((item, i) => (
            <li key={item.name} className="flex items-start justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={fixedRows[i].requiresPhoto}
                  onChange={() => toggleFixedPhoto(i)}
                  className="rounded"
                />
                Wajib foto
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium">Item Tambahan (opsional)</p>
        <div className="flex flex-col gap-2">
          {extraItems.map((item, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={item.itemName}
                onChange={(e) => updateExtra(i, { itemName: e.target.value })}
                placeholder="Nama item, contoh: Membaca 15 menit"
                className={`${inputClass} min-w-40 flex-1`}
              />
              <input
                value={item.description ?? ""}
                onChange={(e) => updateExtra(i, { description: e.target.value })}
                placeholder="Keterangan contoh (opsional)"
                className={`${inputClass} min-w-40 flex-1`}
              />
              <select
                value={item.itemType}
                onChange={(e) =>
                  updateExtra(i, { itemType: e.target.value as NewTemplateItem["itemType"] })
                }
                className={`${inputClass} w-52 shrink-0`}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <label className="flex shrink-0 items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={item.requiresPhoto}
                  onChange={() => updateExtra(i, { requiresPhoto: !item.requiresPhoto })}
                  className="rounded"
                />
                Wajib foto
              </label>
              <button
                type="button"
                onClick={() => removeExtraRow(i)}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label={`Hapus item tambahan ${i + 1}`}
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addExtraRow}
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
