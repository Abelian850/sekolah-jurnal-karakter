/**
 * 7 Kebiasaan Anak Indonesia Hebat - item jurnal TETAP (revisi Juli 2026).
 * Setiap template jurnal WAJIB memuat ketujuh item ini (boleh ditambah item
 * lain oleh sekolah). Daftar dipakai di:
 * - apps/api routes/journal-templates.ts: validasi create template.
 * - apps/web form pembuatan template (Admin & Guru Wali): baris terkunci.
 * Perbandingan nama dilakukan persis (case-sensitive) - jangan mengubah
 * teks nama tanpa memigrasikan template yang sudah ada.
 */
export interface FixedJournalItem {
  name: string;
  /** Keterangan contoh yang tampil ke murid saat mengisi jurnal. */
  description: string;
}

export const FIXED_JOURNAL_ITEMS: FixedJournalItem[] = [
  {
    name: "Bangun Pagi",
    description:
      "Contoh: bangun sebelum pukul 05.30, langsung merapikan tempat tidur sendiri.",
  },
  {
    name: "Beribadah",
    description:
      "Contoh: salat lima waktu / ibadah sesuai agama, mengaji atau membaca kitab suci, berdoa sebelum belajar.",
  },
  {
    name: "Berolahraga",
    description:
      "Contoh: lari pagi, senam, bersepeda, atau bermain bola minimal 15-30 menit.",
  },
  {
    name: "Gemar Belajar",
    description:
      "Contoh: membaca buku, mengerjakan PR, atau belajar mandiri minimal 30 menit di luar jam sekolah.",
  },
  {
    name: "Makan Sehat dan Bergizi",
    description:
      "Contoh: sarapan sebelum berangkat sekolah, makan sayur dan buah, tidak jajan sembarangan.",
  },
  {
    name: "Bermasyarakat (Bersosialisasi)",
    description:
      "Contoh: membantu orang tua di rumah, ikut kerja bakti, bermain bersama teman, kegiatan masjid/karang taruna.",
  },
  {
    name: "Tidur Lebih Awal (Tidur Cepat)",
    description:
      "Contoh: tidur malam pukul 21.00-22.00 agar istirahat cukup 8 jam.",
  },
];

export const FIXED_JOURNAL_ITEM_NAMES = FIXED_JOURNAL_ITEMS.map((i) => i.name);

/**
 * Item yang TIDAK ikut menentukan nilai karakter (revisi Juli 2026 tahap 3).
 *
 * "Beribadah" dikeluarkan karena aturan "selesai"-nya tidak setara antar
 * agama: murid Islam baru dianggap selesai bila kelima sholat dijawab "Ya",
 * sedangkan murid non-Islam otomatis selesai begitu isian ibadahnya terisi
 * (lihat deriveHabitStatus di journal-questions.ts). Selama item ini diskor,
 * angka nilai karakter ikut mengukur ketaatan ritual - sesuatu yang tidak
 * bisa dibandingkan lintas agama, dan menghukum murid yang justru sedang
 * menjalankan aturan agamanya (mis. tidak sholat karena haid).
 *
 * Item ini TETAP diisi murid, TETAP tampil ke Guru Wali saat verifikasi, dan
 * TETAP dihitung di habitCounts pada rekap (analytics.ts). Yang berubah hanya
 * satu: ia tidak masuk computeCharacterScore.
 *
 * Perbandingan nama dilakukan PERSIS (case-sensitive), sama seperti
 * FIXED_JOURNAL_ITEMS - mengubah teks nama item akan memutus pengecualian ini.
 */
export const UNSCORED_JOURNAL_ITEM_NAMES: readonly string[] = ["Beribadah"];

/** true bila item ikut menentukan nilai karakter. */
export function isScoredJournalItem(itemName: string): boolean {
  return !UNSCORED_JOURNAL_ITEM_NAMES.includes(itemName);
}

// Pengaman saat build: setiap nama yang dikecualikan harus benar-benar ada
// di daftar item tetap. Salah ketik akan terdeteksi saat modul di-import,
// bukan diam-diam membuat pengecualian tidak pernah cocok.
for (const name of UNSCORED_JOURNAL_ITEM_NAMES) {
  if (!FIXED_JOURNAL_ITEM_NAMES.includes(name)) {
    throw new Error(
      `journal-items: UNSCORED_JOURNAL_ITEM_NAMES memuat "${name}" yang tidak ada di FIXED_JOURNAL_ITEMS`
    );
  }
}
