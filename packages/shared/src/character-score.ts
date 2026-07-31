import { UNSCORED_JOURNAL_ITEM_NAMES } from "./journal-items";

/**
 * Nilai karakter otomatis - SATU-SATUNYA sumber kebenaran.
 *
 * Fungsi ini sengaja tinggal di packages/shared, bukan di apps/api, supaya
 * jalur verifikasi (routes/verifications.ts) dan skrip hitung ulang data lama
 * (db/backfill-character-score.ts) memakai rumus yang persis sama. Kalau
 * rumusnya diduplikasi, keduanya pasti melenceng cepat atau lambat dan nilai
 * murid jadi tidak bisa dipertanggungjawabkan.
 *
 * Rumus (revisi Juli 2026 tahap 3):
 *   (jumlah item "selesai" / jumlah item YANG DISKOR) x 100
 *
 * - Item pada UNSCORED_JOURNAL_ITEM_NAMES (mis. "Beribadah") dibuang dari
 *   pembilang DAN penyebut. Dengan 7 item tetap, penyebutnya jadi 6 sehingga
 *   tiap kebiasaan bernilai ~16,67 - bukan lagi ~14,29.
 * - Status "sebagian" hanya ada pada data lama; dihitung setengah.
 * - Minimal 1 karena kolom verifications.character_score bermakna 1-100.
 * - null bila tidak ada satu pun item yang diskor (mis. template hanya berisi
 *   item yang dikecualikan). Kolomnya nullable, jadi ini sah.
 */
export interface ScorableJournalItem {
  /** Harus sama dengan journal_template_items.item_name. */
  itemName: string;
  /** journal_items.status: "selesai" | "sebagian" (data lama) | "belum". */
  status: string;
}

export function computeCharacterScore(items: ScorableJournalItem[]): number | null {
  const scored = items.filter((it) => !UNSCORED_JOURNAL_ITEM_NAMES.includes(it.itemName));
  if (scored.length === 0) return null;

  const points = scored.reduce(
    (acc, it) => acc + (it.status === "selesai" ? 1 : it.status === "sebagian" ? 0.5 : 0),
    0
  );
  return Math.max(1, Math.round((points / scored.length) * 100));
}
