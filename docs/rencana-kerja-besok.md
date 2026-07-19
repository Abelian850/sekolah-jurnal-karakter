# Rencana Kerja — sesi berikutnya (per 19 Juli 2026)

## Konteks (hasil sesi 19 Juli)

- **Laporan Guru Wali SELESAI** (commit 5badbff): endpoint
  `GET /analytics/guru-wali-recap?from&to` + panel "Unduh Laporan" di
  dashboard Guru Wali (pilih bulan, tombol Excel via SheetJS + PDF via
  jsPDF/autotable dynamic import). Rekap 7 Kebiasaan ikut (sheet 2 /
  tabel 2), hanya menghitung jurnal submitted/approved. Dependensi baru
  apps/web: jspdf ^3.0.4, jspdf-autotable ^5.0.8.
- **BELUM ter-push: 36a87a0, 5e58945 (sesi 18/7) + 5badbff + commit docs ini**
  — sandbox tetap tanpa kredensial GitHub. Push manual, tunggu CI hijau,
  baru cek deploy. Typecheck api+web & eslint file terdampak SUDAH lolos
  di sandbox (tsconfig.sandbox.json).
- [ ] **UJI MANUAL laporan Guru Wali** setelah deploy: login guru wali,
  unduh Excel & PDF bulan berjalan, cek angka vs dashboard. Belum diuji
  end-to-end (sandbox tidak menjalankan server).
- Catatan sandbox: OneDrive mengunci file `.git` (warning "unable to
  unlink ... .lock") — jika git menolak operasi berikutnya, hapus manual
  `.git/HEAD.lock`, `.git/index.lock`, `.git/objects/maintenance.lock`.
- `LOGO SPEGALUH.png` di root repo belum di-commit (menunggu keputusan pemakaian).

## Prioritas 1 — Tindak lanjut laporan Guru Wali

1. [ ] Uji manual (lihat atas). Perhatikan PDF bila siswa binaan > ±35
   (pecah halaman autotable) dan nama kebiasaan panjang di header tabel.
2. [ ] Setelah versi Guru Wali dipakai dan terbukti pas, baru pertimbangkan
   tombol serupa untuk KS (rekap satu sekolah).

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
