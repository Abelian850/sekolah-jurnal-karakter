/**
 * Tanggal "hari ini" dalam zona waktu WIB (UTC+7), format YYYY-MM-DD.
 *
 * CATATAN MVP (Fase 5): offset di-hardcode karena (1) Indonesia tidak
 * memakai DST sehingga offset stabil, dan (2) belum ada field zona waktu
 * per sekolah di database untuk dijadikan sumber. Jika nanti aplikasi
 * dipakai sekolah di WITA/WIT, tambahkan kolom timezone pada tabel schools
 * dan turunkan dari sana.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getTodayDateWIB(): string {
  return new Date(Date.now() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD menjadi tampilan Indonesia, mis. "Rabu, 8 Juli 2026". */
export function formatDateID(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00+07:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}
