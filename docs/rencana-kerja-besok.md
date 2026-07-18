# Rencana Kerja — Minggu, 19 Juli 2026

## Konteks (hasil sesi 18 Juli)

- Fase 9 hampir tuntas: ganti sandi mandiri, audit login, rate limiting login
  (berbasis `audit_logs` action `login_failed`), CORS fail-closed. Validasi
  upload sudah ada sejak fitur R2.
- Fitur Siswa Terajin selesai: `GET /analytics/top-students` (KS) +
  `/analytics/admin-top-students` (Admin) + kartu di kedua dashboard.
- **Dua commit sesi 2 (36a87a0, 5e58945) BELUM ter-push** — sandbox tidak punya
  kredensial GitHub. Push manual dulu, tunggu CI hijau (typecheck web belum
  terverifikasi penuh di sandbox), baru cek deploy.
- `LOGO SPEGALUH.png` di root repo belum di-commit (menunggu keputusan pemakaian).

## Prioritas 1 — Fitur baru: Download Laporan untuk Guru Wali

Tujuan: Guru Wali bisa mengunduh rekap Excel siswa binaannya per periode.

1. [ ] Endpoint agregasi `GET /analytics/guru-wali-recap?from=YYYY-MM-DD&to=YYYY-MM-DD`
   (permission `JOURNAL_VERIFY`, scope siswa dari `teacher_student` milik guru
   di JWT — pola scoping sama dengan daftar siswa Guru Wali). Per siswa:
   nama, NISN, kelas, jumlah jurnal terkirim/disetujui/ditolak/draft, jumlah
   hari tanpa jurnal, rata-rata `characterScore` dari `verifications`.
2. [ ] Opsional sheet kedua: rekap 7 Kebiasaan per siswa (berapa kali tiap
   kebiasaan "selesai") dari `journal_items` — cek dulu bentuk datanya.
3. [ ] Tombol "Unduh Laporan" di dashboard Guru Wali + pilihan periode
   (default bulan berjalan). Generate .xlsx DI BROWSER dengan SheetJS —
   pola persis `components/export-students-button.tsx` (lihat alasan desain
   di `docs/bulk-import-export.md`; Workers tidak cocok generate file biner).
4. [ ] Nama file: `laporan-jurnal-<kelas/guru>-<from>_<to>.xlsx`.
5. [ ] Setelah jadi, pertimbangkan tombol serupa untuk KS (rekap satu sekolah)
   — JANGAN dikerjakan sebelum versi Guru Wali dipakai dan terbukti pas.

## Prioritas 2 — Sisa Fase 9 & verifikasi migrasi (carry-over)

1. [ ] Uji login produksi `admin30@sekolah.com` (bandingkan kecepatan pasca-migrasi Singapore).
2. [ ] Uji login lokal (`npm run dev:web` + `dev:api`).
3. [ ] Hapus project Neon lama us-east-1 SETELAH produksi terbukti jalan.
4. [ ] **Backup/restore** — dokumentasikan prosedur export via Neon (branch
   snapshot / pg_dump); Free plan punya point-in-time restore terbatas.

## Opsional / catatan (carry-over)

- [ ] Export guru (Excel, pola `export-students-button.tsx`).
- [ ] Statistik 7 Kebiasaan paling sering "selesai" dari `journal_items` (kartu KS/Admin).
- [ ] Keep-alive ping (cron 4 menit → health endpoint) jika cold start masih mengganggu.
- [ ] Fase 10: perbarui `docs/tutorial-penggunaan.md` (kelulusan/kenaikan, revisi 11 Juli,
  fitur 18 Juli: ganti sandi, siswa terajin, rate limiting, laporan Guru Wali).
- [ ] Opsional landing: pakai `schools.logoUrl` agar logo tidak hardcode.
- Catatan rate limiting: akun terkunci melihat pesan "kredensial salah" generik —
  kalau ada keluhan siswa bingung, pertimbangkan pesan khusus (trade-off: memberi
  sinyal ke penyerang).
- Status proyek: Fase 1–8 selesai; Fase 9 tinggal backup/restore; sisa Fase 10 (±10–15%).
