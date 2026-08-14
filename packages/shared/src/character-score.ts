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

/**
 * Lantai nilai rapor (revisi Agustus 2026).
 *
 * Skor mentah computeCharacterScore adalah persentase kebiasaan yang selesai,
 * jadi 4 dari 6 kebiasaan = 67. Angka itu benar sebagai ukuran capaian, tapi
 * di rapor sekolah angka di bawah KKM terbaca "tidak tuntas" oleh orang tua -
 * padahal murid yang bersangkutan menjalankan dua pertiga kebiasaan.
 *
 * Solusinya SENGAJA dipisah: database tetap menyimpan persentase mentah
 * (verifications.character_score), dan pemetaan ke skala rapor hanya terjadi
 * saat angka ditampilkan. Konsekuensinya:
 * - Data lama tidak perlu di-backfill; tampilannya ikut berubah sendiri.
 * - Dashboard Admin & Kepala Sekolah tetap memakai angka mentah supaya masih
 *   bisa membedakan kelas yang capaiannya 33% dan 67%. Labelnya di sana
 *   berbunyi "capaian kebiasaan", bukan "nilai", agar tidak tertukar.
 * - Kalau suatu saat lantainya diubah, cukup ganti konstanta di bawah ini.
 */
export const REPORT_SCORE_FLOOR = 70;

/**
 * Petakan skor mentah (1-100) ke skala rapor (REPORT_SCORE_FLOOR-100).
 *
 * Pemetaannya LINEAR: nilai = lantai + (mentah / 100) x (100 - lantai).
 * Sifat linear ini penting - artinya memetakan sebuah rata-rata memberi hasil
 * yang sama dengan merata-ratakan nilai yang sudah dipetakan (selisih
 * pembulatan saja), sehingga avgScore dari API boleh langsung dipetakan tanpa
 * perlu menarik ulang tiap baris.
 *
 * Dengan 6 item yang diskor dan lantai 70, hasilnya bulat rapi:
 *   0/6 -> 70, 1/6 -> 75, 2/6 -> 80, 3/6 -> 85, 4/6 -> 90, 5/6 -> 95, 6/6 -> 100
 *
 * null diteruskan sebagai null (jurnal belum dinilai / tidak ada item diskor).
 */
export function toReportScore(rawScore: number | null | undefined): number | null {
  if (rawScore == null || !Number.isFinite(rawScore)) return null;
  const clamped = Math.min(100, Math.max(0, rawScore));
  const scaled = REPORT_SCORE_FLOOR + (clamped / 100) * (100 - REPORT_SCORE_FLOOR);
  return Math.min(100, Math.max(REPORT_SCORE_FLOOR, Math.round(scaled)));
}
