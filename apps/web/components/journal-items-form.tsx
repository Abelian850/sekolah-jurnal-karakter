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

export interface EvidenceRequirementInfo {
  templateItemId: string;
  itemName: string;
  /** "harian" = ditetapkan Guru Wali untuk tanggal ini; "template" = default template. */
  source: "harian" | "template";
}

/** Nilai TERSIMPAN satu item - dipakai untuk validasi sebelum kirim. */
interface SavedItemValues {
  status: JournalItemData["status"];
  note: string;
  photoUrl: string;
}

/**
 * Form pengisian jurnal per item. Setiap baris menyimpan dirinya sendiri
 * lewat server action (pola useTransition seperti assign-guru-wali-form.tsx,
 * bukan <form action>, karena input berupa array dinamis mengikuti item
 * template).
 *
 * Aturan 7 Kebiasaan Anak Indonesia Hebat (harus sama dengan validasi
 * server di apps/api/src/routes/journals.ts endpoint submit):
 * 1. Semua item wajib terisi - status "belum" hanya boleh jika ada keterangan.
 * 2. Wajib minimal satu foto bukti; kebiasaan wajib berbukti datang dari
 *    Bukti Harian Guru Wali (menang) atau default template (requiresPhoto),
 *    dan setiap yang dikerjakan harus berfoto (status "belum" berketerangan
 *    dikecualikan; tanpa kebiasaan wajib berlaku fallback foto bebas).
 * Validasi di sini hanya untuk pesan yang ramah; server tetap sumber
 * kebenaran dan memvalidasi ulang.
 */
function ItemRow({
  journalId,
  item,
  isEvidenceRequired,
  onSaved,
}: {
  journalId: string;
  item: JournalItemData;
  isEvidenceRequired: boolean;
  onSaved: (itemId: string, values: SavedItemValues) => void;
}) {
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

    const trimmedNote = note.trim();
    const trimmedPhoto = photoUrl.trim();

    // Status efektif: tipe catatan/foto tidak punya dropdown status,
    // statusnya diturunkan dari isiannya.
    let effectiveStatus = status;
    if (item.itemType === "catatan") {
      effectiveStatus = trimmedNote ? "selesai" : "belum";
    } else if (item.itemType === "foto") {
      effectiveStatus = trimmedPhoto ? "selesai" : "belum";
    }

    const payload: UpdateJournalItemPayload = {
      status: effectiveStatus,
      note: trimmedNote || null,
      photoUrl: trimmedPhoto || null,
    };
    if (item.itemType === "waktu") {
      payload.recordedTime = recordedTime || null;
    }

    startTransition(async () => {
      try {
        await updateJournalItem(journalId, item.id, payload);
        setSaved(true);
        onSaved(item.id, { status: effectiveStatus, note: trimmedNote, photoUrl: trimmedPhoto });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      }
    });
  }

  const needsNoteHint = (item.itemType === "checklist" || item.itemType === "waktu") && status === "belum";

  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{item.itemName}</p>
        {isEvidenceRequired && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-900/40 dark:text-brand-500">
            Wajib foto hari ini
          </span>
        )}
      </div>
      {item.description && <p className="text-xs text-slate-500">{item.description}</p>}

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
      </div>

      {item.itemType === "catatan" ? (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Tulis catatanmu di sini..."
          className={inputClass}
        />
      ) : (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            needsNoteHint
              ? "Keterangan WAJIB diisi karena status masih Belum"
              : "Keterangan (wajib diisi jika Belum)"
          }
          className={inputClass}
        />
      )}

      <input
        value={photoUrl}
        onChange={(e) => setPhotoUrl(e.target.value)}
        placeholder={
          isEvidenceRequired
            ? "Tempel tautan (URL) foto bukti - WAJIB untuk kebiasaan ini hari ini"
            : "Tempel tautan (URL) foto bukti (opsional)"
        }
        className={inputClass}
      />

      <div className="flex items-center gap-3">
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
  evidenceRequirements,
}: {
  journalId: string;
  items: JournalItemData[];
  evidenceRequirements: EvidenceRequirementInfo[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Nilai TERSIMPAN per item (server-side truth yang kita ketahui).
  // Diinisialisasi dari props, diperbarui setiap kali satu baris sukses
  // tersimpan. Isian yang belum disimpan sengaja TIDAK dihitung.
  const [savedValues, setSavedValues] = useState<Record<string, SavedItemValues>>(() =>
    Object.fromEntries(
      items.map((i) => [
        i.id,
        { status: i.status, note: (i.note ?? "").trim(), photoUrl: (i.photoUrl ?? "").trim() },
      ])
    )
  );

  function handleRowSaved(itemId: string, values: SavedItemValues) {
    setSavedValues((prev) => ({ ...prev, [itemId]: values }));
  }

  /** Replika validasi server - kembalikan pesan error, atau null jika lolos. */
  function validate(): string | null {
    const incomplete = items.filter((i) => {
      const v = savedValues[i.id];
      return v && v.status === "belum" && v.note === "";
    });
    if (incomplete.length > 0) {
      return (
        "Semua kebiasaan wajib diisi. Lengkapi (atau beri keterangan jika belum dilakukan): " +
        incomplete.map((i) => i.itemName).join(", ") +
        ". Jangan lupa klik Simpan pada setiap item."
      );
    }

    const requiredIds = new Set(evidenceRequirements.map((r) => r.templateItemId));
    const requiredItems = items.filter((i) => {
      const v = savedValues[i.id];
      return requiredIds.has(i.templateItemId) && v && v.status !== "belum";
    });

    const missingPhoto = requiredItems.filter((i) => (savedValues[i.id]?.photoUrl ?? "") === "");
    if (missingPhoto.length > 0) {
      const source = evidenceRequirements[0]?.source === "harian" ? "Guru Wali" : "Template jurnal";
      return (
        `${source} mewajibkan foto bukti pada kebiasaan: ` +
        missingPhoto.map((i) => `"${i.itemName}"`).join(", ") +
        ". Lampirkan fotonya (dan klik Simpan) sebelum mengirim."
      );
    }

    if (
      requiredItems.length === 0 &&
      !items.some((i) => (savedValues[i.id]?.photoUrl ?? "") !== "")
    ) {
      return "Lampirkan minimal satu foto bukti pada salah satu kebiasaan (dan klik Simpan) sebelum mengirim jurnal.";
    }

    return null;
  }

  function handleSubmit() {
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!window.confirm("Kirim jurnal hari ini? Setelah dikirim, isian tidak bisa diubah lagi.")) {
      return;
    }
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
      {evidenceRequirements.length > 0 && (
        <div className="mb-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-900/20 dark:text-brand-500">
          {evidenceRequirements[0].source === "harian"
            ? "Hari ini Guru Wali mewajibkan foto bukti pada kebiasaan "
            : "Template jurnal mewajibkan foto bukti pada kebiasaan "}
          <span className="font-medium">
            {evidenceRequirements.map((r) => r.itemName).join(", ")}
          </span>
          .
        </div>
      )}

      <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            journalId={journalId}
            item={item}
            isEvidenceRequired={evidenceRequirements.some(
              (r) => r.templateItemId === item.templateItemId
            )}
            onSaved={handleRowSaved}
          />
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
          Semua kebiasaan wajib diisi &amp; minimal satu foto bukti. Pastikan setiap item sudah
          disimpan sebelum mengirim.
        </p>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
