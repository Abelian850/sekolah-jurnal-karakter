# Catatan Sesi — 8 Juli 2026

Ringkasan pekerjaan hari ini + rencana lanjutan. Baca file ini dulu sebelum
melanjutkan sesi berikutnya.

## Selesai hari ini (4 commit, SEMUA masih lokal — belum di-push)

1. **`02fe6a5` — Penutupan Fase 5 (Modul Jurnal Harian).** Kode Fase 5 sudah
   ada dari sesi sebelumnya tapi belum di-commit; hari ini diverifikasi
   (typecheck lolos), didokumentasikan (tutorial + README), lalu di-commit.
   Termasuk perbaikan index git yang korup.
2. **`93133b7` — Fase 6: Validasi & Penilaian Karakter + Notifikasi.**
   - Guru Wali: tab Menunggu Verifikasi, halaman periksa, tab Riwayat.
   - Tiga keputusan: **Setujui** (nilai karakter 1-100 wajib, final),
     **Minta Revisi** (catatan wajib, jurnal kembali draft, siswa kirim
     ulang), **Tolak** (catatan wajib, final).
   - Notifikasi in-app otomatis ke siswa + semua orang tua tertaut
     (`/notifications`; UI orang tua menyusul di Fase 7).
   - Siswa: banner revisi, hasil verifikasi di riwayat, halaman Notifikasi
     dengan badge belum-dibaca.
   - Migrasi `0001`: enum notification_type + `revisi`.
3. **`b60a8a1` — Login siswa dengan NISN.**
   - Username & kata sandi awal siswa = NISN; email/password dihapus dari
     form tambah siswa & impor Excel (akun otomatis, email internal
     `<nisn>@siswa.internal`, helper di `packages/shared/src/students.ts`).
   - NISN wajib & unik (migrasi `0002`), template Excel dibuat ulang.
   - Tombol "Reset sandi ke NISN" per siswa untuk akun lama.
4. **`e07bf14` — Fix `db:migrate` di Windows**: DATABASE_URL dibaca otomatis
   dari `apps/api/.dev.vars`. Migrasi 0000-0002 SUDAH dijalankan user ke
   Neon dengan sukses.

## Requirement BARU dari user (belum diimplementasikan)

Aplikasi ini untuk program **"7 Kebiasaan Anak Indonesia Hebat"**. Aturan:

- **Ketujuh kebiasaan (item jurnal) wajib diisi setiap hari**, meskipun
  hanya berupa ceklis → saat siswa klik "Kirim Jurnal", semua item harus
  sudah terisi (tidak boleh ada yang berstatus "belum" tanpa keterangan).
  Saat ini submit TIDAK memvalidasi kelengkapan — perlu ditambahkan.
- **Bukti (foto) cukup SATU** dari salah satu kebiasaan, dan **kebiasaan
  mana yang wajib berbukti dipilih oleh Guru Wali** (bukan siswa).
  Perlu keputusan desain: di mana Guru Wali memilihnya (per siswa? per
  periode? saat verifikasi?) — tanyakan ke user sebelum implementasi.

## Rencana besok

1. Implementasikan requirement 7 Kebiasaan di atas (klarifikasi dulu
   mekanisme pemilihan bukti oleh Guru Wali).
2. Lanjut **Fase 7 — Dashboard Kepala Sekolah & Orang Tua** (lihat README).
   Catatan siap pakai: notifikasi orang tua sudah dibuat backend-nya di
   Fase 6; `resolveSchoolId` di auth belum memodelkan sekolah untuk
   kepala_sekolah (lihat komentar di apps/web/lib/auth.ts).

## Hal teknis yang perlu diingat

- **Push ke GitHub belum dilakukan** (4 commit lokal). CI akan menjalankan
  db:migrate lagi saat push — aman, migrasi idempoten & sudah terpasang.
- Kata sandi = NISN mudah ditebak → fitur ganti kata sandi mandiri
  dijadwalkan Fase 9 (sudah dicatat di tutorial).
- Typecheck di sandbox Linux perlu tsconfig sementara dengan paths
  `@sjk/shared` (symlink npm Windows tak terbaca); drizzle-kit harus
  dijalankan dari instalasi terpisah (mis. /tmp/dk) karena esbuild
  node_modules ter-install untuk Windows.
- Verifikasi hari ini sebatas typecheck + review; pengujian end-to-end
  dilakukan manual oleh user (login NISN & alur Fase 6 sudah diuji user:
  "oke sudah bagus").
