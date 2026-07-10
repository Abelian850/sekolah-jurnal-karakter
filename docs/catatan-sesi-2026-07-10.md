# Catatan Sesi — 10 Juli 2026

## Selesai: Fase 8 — Landing Page & Polish UI/UX

Commit `6f74e04`.

**Landing page** (`apps/web/app/page.tsx`) — server component murni, tanpa
dependensi & JS klien baru:

- Header sticky (glass) dengan anchor nav (Fitur/Alur/FAQ) + tombol Masuk.
- Hero (badge 7 Kebiasaan, gradien brand), chip daftar 7 Kebiasaan,
  kartu fitur 5 peran, alur kerja 4 langkah, FAQ `<details>` native,
  CTA akhir, footer.

**Polish UI/UX**:

- `app/login/page.tsx` — gradien senada landing, judul aplikasi, tautan
  "← Kembali ke beranda".
- Baru: `app/loading.tsx` (spinner global), `app/not-found.tsx` (404),
  `app/error.tsx` (error boundary klien + reset + digest).

Typecheck web lolos (`tsconfig.sandbox.json`). Docs: README Fase 8
dicentang + blok catatan; tutorial-penggunaan.md bagian Fase 8.

## Catatan teknis sesi ini

- Push dari sandbox TIDAK bisa: tidak ada kredensial GitHub (gh/token/
  credential store). Push dilakukan user dari terminal Windows.
- JANGAN pernah menjalankan tsc dengan `--noEmit false` — memancarkan ~90
  file .js ke repo. Pembersihan dengan `git clean -f` juga menghapus file
  .tsx baru yang masih untracked (harus dibuat ulang). Pelajaran: `git add`
  file baru SEBELUM `git clean`, atau `git clean` dengan path spesifik.
- Izin hapus file perlu diaktifkan lagi via `allow_cowork_file_delete`
  (per sesi); setelah itu `rm`/`git clean` jalan, termasuk `.git/index.lock`.
- Identitas git per-repo perlu diset ulang tiap sesi sandbox
  (`git config user.name/email` dari `git log -1`).

## Rencana berikutnya

1. **Uji manual lokal** (masih belum dilakukan; kini bertambah landing
   page & halaman error/404): (a) Guru Wali tab Bukti Harian; (b) siswa
   submit jurnal + validasi foto; (c) verifikasi + nilai; (d) admin buat
   KS → dashboard analitik; (e) orang tua komentar → notifikasi;
   (f) landing page `/`, login, 404, loading state.
2. Push ke GitHub bila belum (cek `git log origin/main..HEAD`).
3. Lanjut **Fase 9 — Audit log, backup/restore, hardening keamanan**.
