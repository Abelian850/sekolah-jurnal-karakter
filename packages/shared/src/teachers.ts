/**
 * Konvensi akun Guru (revisi Juli 2026), meniru konvensi siswa
 * (lihat students.ts):
 * - Login guru = NIP ATAU email.
 * - Kata sandi AWAL guru = NIP (dapat direset via
 *   PATCH /teachers/:id/reset-password).
 * - Tabel `users` tetap mewajibkan email unik. Jika Admin tidak mengisi
 *   email, email dibuat otomatis dari NIP dengan domain internal yang
 *   tidak bisa menerima surat sungguhan.
 * Konvensi ini dipakai di DUA tempat yang WAJIB seragam: API (pembuatan
 * akun guru) dan Auth.js di apps/web (resolusi login NIP) - karena itu
 * diletakkan di packages/shared.
 */
export const TEACHER_EMAIL_DOMAIN = "guru.internal";

export function nipToEmail(nip: string): string {
  return `${nip}@${TEACHER_EMAIL_DOMAIN}`.toLowerCase();
}

/**
 * NIP valid = 5-30 digit angka. NIP PNS resmi 18 digit, tapi dibuat
 * longgar agar NI PPPK / NUPTK / nomor identitas lokal yayasan tetap
 * bisa dipakai (sejalan dengan kelonggaran NISN_REGEX).
 */
export const NIP_REGEX = /^\d{5,30}$/;
