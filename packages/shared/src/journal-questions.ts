import { FIXED_JOURNAL_ITEM_NAMES } from "./journal-items";

/**
 * Model isian jurnal ala formulir (revisi Juli 2026 tahap 2).
 * Setiap kebiasaan dari 7 Kebiasaan Anak Indonesia Hebat punya daftar
 * sub-pertanyaan (pilihan ganda / teks) menggantikan dropdown status
 * "Selesai/Sebagian/Belum". Jawaban disimpan di journal_items.answers
 * (jsonb, Record<key, string>). Data lama (answers NULL) tetap dibaca
 * dengan tampilan lama - TIDAK dimigrasikan.
 *
 * Dipakai di:
 * - apps/web components/journal-items-form.tsx : render form siswa.
 * - apps/web components/journal-items-view.tsx : render jawaban (read-only).
 * - apps/api routes/journals.ts : validasi submit + derivasi status item.
 *
 * PENTING: `key` adalah kunci penyimpanan di jsonb - jangan diubah tanpa
 * memikirkan data yang sudah tersimpan. Status "sebagian" TIDAK dipakai
 * lagi untuk isian baru; enum DB dipertahankan hanya untuk data lama.
 */

export interface QuestionCondition {
  /** Key pertanyaan lain yang menjadi acuan. */
  key: string;
  /** Tampil jika jawaban acuan sama persis dengan nilai ini. */
  equals?: string;
  /** Tampil jika jawaban acuan TIDAK sama dengan nilai ini. */
  notEquals?: string;
}

export interface JournalQuestion {
  key: string;
  label: string;
  type: "pilihan" | "teks";
  options?: readonly string[];
  /** Wajib dijawab (hanya berlaku saat pertanyaan tampil). */
  required?: boolean;
  /** Pertanyaan hanya tampil (dan divalidasi) jika kondisi terpenuhi. */
  showIf?: QuestionCondition;
  /** Placeholder / petunjuk singkat untuk isian teks. */
  hint?: string;
}

export interface HabitQuestionSet {
  /** Harus sama persis dengan FIXED_JOURNAL_ITEMS.name. */
  itemName: string;
  questions: JournalQuestion[];
  /**
   * Item dihitung "selesai" (untuk badge & analytics) jika SEMUA kondisi
   * ini terpenuhi. Kosong/undefined = selesai begitu semua pertanyaan
   * wajib terjawab. Status "sebagian" tidak dipakai lagi.
   */
  doneWhen?: QuestionCondition[];
}

export const YA_TIDAK = ["Ya", "Tidak"] as const;

const AGAMA_OPTIONS = ["ISLAM", "KRISTEN", "KATHOLIK", "HINDU", "BUDHA"] as const;

const SHOLAT_KEYS = [
  { key: "sholat_subuh", label: "Melaksanakan Sholat Subuh" },
  { key: "sholat_dzuhur", label: "Melaksanakan Sholat Dzuhur" },
  { key: "sholat_ashar", label: "Melaksanakan Sholat Ashar" },
  { key: "sholat_maghrib", label: "Melaksanakan Sholat Maghrib" },
  { key: "sholat_isya", label: "Melaksanakan Sholat Isya" },
] as const;

export const HABIT_QUESTION_SETS: HabitQuestionSet[] = [
  {
    itemName: "Bangun Pagi",
    questions: [
      {
        key: "bangun_jam",
        label: "Bangun jam berapa hari ini?",
        type: "pilihan",
        options: ["Sebelum pukul 05.00 WIB", "Lebih dari pukul 05.00 WIB"],
        required: true,
      },
      {
        key: "bangun_alasan",
        label: "Jelaskan, apabila bangun lebih dari pukul 05.00 WIB",
        type: "teks",
        required: true,
        showIf: { key: "bangun_jam", equals: "Lebih dari pukul 05.00 WIB" },
      },
      {
        key: "kondisi_bangun",
        label: "Kondisi bangun",
        type: "pilihan",
        options: ["Dibangunkan", "Bangun sendiri"],
        required: true,
      },
    ],
    doneWhen: [{ key: "bangun_jam", equals: "Sebelum pukul 05.00 WIB" }],
  },
  {
    itemName: "Beribadah",
    questions: [
      {
        key: "agama",
        label: "Pilih agamamu",
        type: "pilihan",
        options: AGAMA_OPTIONS,
        required: true,
      },
      ...SHOLAT_KEYS.map((s) => ({
        key: s.key,
        label: `${s.label} (Untuk Agama Islam)`,
        type: "pilihan" as const,
        options: YA_TIDAK,
        required: true,
        showIf: { key: "agama", equals: "ISLAM" },
      })),
      {
        key: "alasan_tidak_sholat",
        label: "Alasan tidak sholat, jika ada (mis. haid)",
        type: "teks",
        required: false,
        showIf: { key: "agama", equals: "ISLAM" },
      },
      {
        key: "ibadah_nonislam",
        label: "Ibadah apa yang sudah kamu lakukan hari ini?",
        type: "teks",
        required: true,
        showIf: { key: "agama", notEquals: "ISLAM" },
      },
    ],
    // Islam: selesai jika kelima sholat "Ya". Non-Islam: selesai begitu
    // isian ibadah terisi (doneWhen untuk sholat hanya dievaluasi saat
    // pertanyaannya tampil - lihat deriveHabitStatus).
    doneWhen: SHOLAT_KEYS.map((s) => ({ key: s.key, equals: "Ya" })),
  },
  {
    itemName: "Berolahraga",
    questions: [
      {
        key: "olahraga",
        label: "Melaksanakan olahraga hari ini?",
        type: "pilihan",
        options: YA_TIDAK,
        required: true,
      },
      {
        key: "olahraga_detail",
        label: "Olahraga apa yang kamu lakukan dan berapa menit?",
        type: "teks",
        required: true,
        showIf: { key: "olahraga", equals: "Ya" },
      },
      {
        key: "olahraga_alasan",
        label: "Jelaskan alasannya, jika tidak berolahraga",
        type: "teks",
        required: true,
        showIf: { key: "olahraga", equals: "Tidak" },
      },
    ],
    doneWhen: [{ key: "olahraga", equals: "Ya" }],
  },
  {
    itemName: "Gemar Belajar",
    questions: [
      {
        key: "belajar",
        label: "Apakah kamu belajar hari ini?",
        type: "pilihan",
        options: YA_TIDAK,
        required: true,
      },
      {
        key: "belajar_detail",
        label: "Catat, sudah belajar apa saja hari ini?",
        type: "teks",
        required: true,
        showIf: { key: "belajar", equals: "Ya" },
      },
      {
        key: "belajar_alasan",
        label: "Jelaskan alasannya, jika tidak belajar",
        type: "teks",
        required: true,
        showIf: { key: "belajar", equals: "Tidak" },
      },
    ],
    doneWhen: [{ key: "belajar", equals: "Ya" }],
  },
  {
    itemName: "Makan Sehat dan Bergizi",
    questions: [
      {
        key: "makan_pagi",
        label: "Makan pagi, makanan apa saja yang kamu makan?",
        type: "teks",
        required: true,
      },
      {
        key: "makan_pagi_gizi",
        label: "Menurut kamu, apakah menu makan pagimu bergizi?",
        type: "pilihan",
        options: YA_TIDAK,
        required: true,
      },
      {
        key: "makan_siang",
        label: "Makan siang, makanan apa saja yang kamu makan?",
        type: "teks",
        required: true,
      },
      {
        key: "makan_siang_gizi",
        label: "Menurut kamu, apakah menu makan siangmu bergizi?",
        type: "pilihan",
        options: YA_TIDAK,
        required: true,
      },
      {
        key: "makan_malam",
        label: "Makan malam, makanan apa saja yang kamu makan?",
        type: "teks",
        required: true,
      },
      {
        key: "makan_malam_gizi",
        label: "Menurut kamu, apakah menu makan malammu bergizi?",
        type: "pilihan",
        options: YA_TIDAK,
        required: true,
      },
    ],
  },
  {
    itemName: "Bermasyarakat (Bersosialisasi)",
    questions: [
      {
        key: "bermasyarakat",
        label: "Apakah kamu melakukan kegiatan bermasyarakat/yang bersifat kolaborasi hari ini?",
        type: "pilihan",
        options: YA_TIDAK,
        required: true,
      },
      {
        key: "bermasyarakat_detail",
        label: "Jika ya, kegiatan bermasyarakat apa yang kamu lakukan hari ini?",
        type: "teks",
        required: true,
        showIf: { key: "bermasyarakat", equals: "Ya" },
      },
    ],
    doneWhen: [{ key: "bermasyarakat", equals: "Ya" }],
  },
  {
    itemName: "Tidur Lebih Awal (Tidur Cepat)",
    questions: [
      {
        key: "tidur_jam",
        label: "Jam berapa kamu tidur hari ini?",
        type: "pilihan",
        options: ["Sebelum pukul 21.00 WIB", "Lebih dari pukul 21.00 WIB"],
        required: true,
      },
      {
        key: "tidur_alasan",
        label: "Jelaskan, jika tidur lebih dari pukul 21.00 WIB",
        type: "teks",
        required: true,
        showIf: { key: "tidur_jam", equals: "Lebih dari pukul 21.00 WIB" },
      },
    ],
    doneWhen: [{ key: "tidur_jam", equals: "Sebelum pukul 21.00 WIB" }],
  },
];

/** Lookup cepat: nama item (persis) -> set pertanyaan, atau undefined. */
export function findHabitQuestionSet(itemName: string): HabitQuestionSet | undefined {
  return HABIT_QUESTION_SETS.find((s) => s.itemName === itemName);
}

export type JournalAnswers = Record<string, string>;

function conditionMet(cond: QuestionCondition, answers: JournalAnswers): boolean {
  const value = (answers[cond.key] ?? "").trim();
  if (cond.equals !== undefined) return value === cond.equals;
  if (cond.notEquals !== undefined) return value !== "" && value !== cond.notEquals;
  return value !== "";
}

/** Pertanyaan yang sedang tampil berdasarkan jawaban saat ini. */
export function visibleQuestions(
  set: HabitQuestionSet,
  answers: JournalAnswers
): JournalQuestion[] {
  return set.questions.filter((q) => !q.showIf || conditionMet(q.showIf, answers));
}

/**
 * Pertanyaan wajib (dan tampil) yang belum dijawab. [] = isian lengkap.
 * Dipakai client (pesan ramah) dan server (sumber kebenaran) agar aturan
 * validasinya identik.
 */
export function missingRequiredQuestions(
  set: HabitQuestionSet,
  answers: JournalAnswers
): JournalQuestion[] {
  return visibleQuestions(set, answers).filter(
    (q) => q.required && (answers[q.key] ?? "").trim() === ""
  );
}

/**
 * Derivasi status item untuk badge & analytics: "selesai" | "belum".
 * "sebagian" sengaja tidak pernah dihasilkan lagi. Kondisi doneWhen yang
 * pertanyaannya sedang TIDAK tampil (mis. sholat saat agama non-Islam)
 * diabaikan - sehingga siswa non-Islam dinilai dari isian ibadahnya.
 */
export function deriveHabitStatus(
  set: HabitQuestionSet,
  answers: JournalAnswers
): "selesai" | "belum" {
  if (missingRequiredQuestions(set, answers).length > 0) return "belum";
  if (!set.doneWhen || set.doneWhen.length === 0) return "selesai";

  const visibleKeys = new Set(visibleQuestions(set, answers).map((q) => q.key));
  const applicable = set.doneWhen.filter((c) => visibleKeys.has(c.key));
  if (applicable.length === 0) return "selesai";
  return applicable.every((c) => conditionMet(c, answers)) ? "selesai" : "belum";
}

// Pengaman saat build: setiap set pertanyaan harus menunjuk item tetap
// yang dikenal. Kesalahan ketik nama item akan langsung melempar error
// ketika modul di-import (fail fast, bukan diam-diam tidak cocok).
for (const set of HABIT_QUESTION_SETS) {
  if (!FIXED_JOURNAL_ITEM_NAMES.includes(set.itemName)) {
    throw new Error(
      `journal-questions: itemName "${set.itemName}" tidak ada di FIXED_JOURNAL_ITEMS`
    );
  }
}
