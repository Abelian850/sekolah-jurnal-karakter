# Catatan Sesi — 12 Juli 2026

## Selesai 1: Landing page — hero foto latar + logo (placeholder)

Sesuai referensi "7 KAIH": foto latar penuh + overlay gradasi biru gelap,
logo di hero & header, judul dua warna, dua CTA (Isi Jurnal / Wali Kelas —
keduanya ke /login).

- `apps/web/public/logo.png` & `apps/web/public/hero.webp` = **PLACEHOLDER
  buatan** (gradient abstrak). **User tinggal menimpa kedua file dengan aset
  asli tanpa mengubah kode** — nama file harus sama. Saran: logo persegi
  >=256px; hero 1600x900 WebP <300KB, hak jelas (foto kegiatan sekolah
  sendiri; hati-hati privasi wajah siswa).
- `next/image` dengan `fill` + `isolate` pada section (aman untuk -z index);
  `images.unoptimized` sudah aktif (Cloudflare), tidak ada binding baru.
- `schools.logoUrl` BELUM dipakai (tetap opsional/nanti) — logo masih file
  statis, cukup untuk deployment satu sekolah.

## Selesai 2: Fitur Kelulusan & Kenaikan Kelas (sesuai desain 11 Juli)

**Migrasi 0007**: `students.status` varchar(10) default 'aktif'
('aktif'|'lulus'|'pindah'|'keluar') + `students.graduated_at`.
`teacher_student.unassigned_at` sudah ada sejak awal — tidak perlu kolom baru.
`isActive` tetap satu-satunya flag operasional; `status` hanya membedakan
alumni dari nonaktif sebab lain.

**API** (routes/students.ts, permission STUDENT_MANAGE):

- `POST /students/graduate-bulk` `{ schoolId, gradeLevel, excludeStudentIds? }`
  — per siswa aktif di angkatan itu: students.isActive=false + status='lulus'
  + graduatedAt; users.isActive=false (login tertolak, Auth.js cek
  users.isActive); teacher_student aktif → isActive=false + unassignedAt.
  Audit log per siswa (action "graduate"), laporan per baris, respons
  `{ results, excludedCount }`.
- `POST /students/promote-bulk` `{ schoolId, mappings[], excludeStudentIds? }`
  — mappings `{fromClassName, toClassName, toGradeLevel}` eksplisit (validasi:
  from unik, from != to); per siswa: ganti className+gradeLevel, audit log
  "promote". SENGAJA tidak menebak angka romawi otomatis.
- `GET /students` default HANYA aktif; `?includeInactive=true` untuk semua.
- Penugasan wali: form tunggal menolak siswa nonaktif (404/400), bulk assign
  melaporkan per baris "Sudah lulus/nonaktif". Statistik analytics memang
  sudah filter isActive sejak dulu.

**Web**:

- Halaman baru `/dashboard/admin/kelulusan-kenaikan` (+ item sidebar):
  panel 1 Kelulusan (pilih angkatan, centang pengecualian per siswa,
  window.confirm, hasil per baris), panel 2 Kenaikan (tabel pemetaan per
  kelas asal → tujuan yang diisi manual, centang kelas ikut/tidak,
  daftar "tinggal kelas" per kelas, hasil per baris).
  Komponen: `components/graduation-promotion.tsx`; actions di
  `app/dashboard/admin/kelulusan-kenaikan/actions.ts`.
- Daftar siswa admin: default aktif; link "Tampilkan alumni/nonaktif"
  (`?tampilkan=semua`) + kolom Status (Alumni/Pindah/Keluar/Nonaktif).
  Ekspor Excel mengikuti filter yang sedang tampil.

Commit: `feat(landing)` + `feat(kelulusan)` (2 commit). Typecheck api & web
LULUS (salinan /tmp + symlink node_modules root; junction @sjk di-bypass
tsconfig.check.json seperti kemarin).

## Yang harus dilakukan user

1. **Timpa aset placeholder**: `apps/web/public/logo.png` dan
   `apps/web/public/hero.webp` dengan logo & foto asli.
2. **Push** 2 commit baru (sandbox tanpa kredensial GitHub).
3. **Jalankan migrasi** `npm run db:migrate` (0005+0006 bila belum, plus
   0007 — 0007 hanya ADD COLUMN, aman untuk data lama; semua baris lama
   otomatis status='aktif').
4. Urutan operasional tiap tahun ajaran baru: aktifkan tahun ajaran baru →
   kelulusan massal → kenaikan kelas massal.

## Uji manual (bertambah dari daftar 11 Juli)

(h) landing: hero tampil dengan placeholder, lalu dengan aset asli; teks
terbaca di atas foto (overlay); dua CTA ke /login. (i) kelulusan massal:
angkatan IX lulus → tidak bisa login, hilang dari daftar default/penugasan/
ekspor, muncul dengan badge Alumni saat "tampilkan semua", jurnal lama tetap
terbaca dari dashboard KS/orang tua, dashboard guru wali bersih (binaan
terlepas), audit_logs terisi per siswa. (j) pengecualian: siswa IX yang
dicentang tetap aktif. (k) kenaikan massal: pemetaan VII A→VIII A dkk,
siswa "tinggal kelas" tidak berubah, laporan per baris, audit_logs
"promote". (l) penugasan wali (tunggal & massal) menolak alumni. (m) daftar
uji lama sesi 10-11 Juli.

## Catatan teknis sesi ini

- Masalah sinkron OneDrive→sandbox MASIH ada, pola baru: file yang diedit
  dari sisi Windows muncul di mount dengan konten baru tapi TERPOTONG pada
  panjang file lama (atau berekor NUL). Solusi yang dipakai: rekonstruksi
  dari `git show HEAD:` + terapkan ulang edit via python dari sisi sandbox.
  File BARU (bukan edit) tersinkron utuh.
- `index.lock` tersangkut lagi — teratasi setelah izin hapus file
  diaktifkan ulang untuk folder ini.
- drizzle-kit tetap dijalankan di /tmp dengan drizzle-kit@latest
  (+ drizzle-orm@latest) karena snapshot 0003+ tak terbaca kit ^0.24.2.
- `docs/tutorial-penggunaan.md` BELUM diperbarui (Fase 10), termasuk untuk
  fitur kelulusan/kenaikan dan revisi 11 Juli.

## Rencana berikutnya

1. User: aset landing asli + push + migrasi + uji manual di atas.
2. Mulai Fase 9: ganti kata sandi mandiri (sandi awal guru = NIP, makin
   penting), kelengkapan audit log, backup/restore, hardening.
3. Opsional landing: pakai `schools.logoUrl` dari data agar logo per
   sekolah tidak hardcode.
