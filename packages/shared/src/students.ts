/**
 * Konvensi akun Peserta Didik (keputusan pasca-Fase 6):
 * - Username login siswa = NISN (bukan email).
 * - Kata sandi AWAL siswa = NISN (bisa direset ulang oleh Admin).
 * - Tabel `users` tetap mewajibkan email unik, maka email siswa dibuat
 *   otomatis dari NISN dengan domain internal yang tidak bisa menerima
 *   surat sungguhan. Konvensi ini dipakai di DUA tempat yang WAJIB seragam:
 *   API (pembuatan akun) dan Auth.js di apps/web (resolusi login) -
 *   karena itu diletakkan di packages/shared.
 */
export const STUDENT_EMAIL_DOMAIN = "siswa.internal";

export function nisnToEmail(nisn: string): string {
  return `${nisn}@${STUDENT_EMAIL_DOMAIN}`.toLowerCase();
}

/** NISN valid = 5-30 digit angka (standar nasional 10 digit, dibuat longgar). */
export const NISN_REGEX = /^\d{5,30}$/;

/**
 * Angkatan (gradeLevel) diturunkan OTOMATIS dari kata pertama nama kelas:
 * "IX A" -> "IX", "IX" -> "IX", "VII B" -> "VII". Dipakai API saat membuat/
 * mengimpor siswa supaya admin cukup mengisi SATU kolom Kelas - dua kolom
 * yang harus konsisten manual (Kelas + Angkatan) terbukti rawan salah ketik
 * dan membuat kelulusan/kenaikan massal meleset.
 */
export function classNameToGradeLevel(className: string): string {
  return className.trim().split(/\s+/)[0] ?? "";
}
