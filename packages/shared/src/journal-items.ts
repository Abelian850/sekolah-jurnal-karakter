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
  /** Keterangan contoh yang tampil ke siswa saat mengisi jurnal. */
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
