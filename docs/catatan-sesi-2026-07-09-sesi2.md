# Catatan Sesi — 9 Juli 2026 (sesi 2)

## Selesai: Fase 7 — Dashboard Kepala Sekolah & Orang Tua

Keputusan desain (dikonfirmasi user):

- Kepala Sekolah dimodelkan dengan **tabel profil `principals`**
  (userId unik, schoolId TIDAK unik, fullName, phone) — pola teachers/students.
- **Komentar orang tua** masuk fase ini (tabel `comments`, userId menunjuk
  `users` agar role lain bisa membalas nanti tanpa migrasi).
- Visualisasi dashboard KS: **kartu + bar CSS Tailwind**, tanpa dependensi baru.

Implementasi (commit `a70143a`):

1. **Migrasi `0004`** (principals + comments) — BELUM dijalankan ke Neon:
   `npm run db:migrate`.
2. **Permission baru** `PRINCIPAL_MANAGE` (admin). `resolveSchoolId` di
   apps/web/lib/auth.ts kini mengisi schoolId untuk kepala_sekolah.
3. **API baru**: `/principals` (GET/POST/DELETE, admin),
   `/analytics/summary?date=&days=` (KS; schoolId selalu dari JWT),
   `/children` + `/children/:studentId/journals` +
   `/children/journals/:id` + `POST .../comments` (orang tua; komentar
   memicu notifikasi "komentar" ke siswa & guru wali aktif).
   `services/comments.ts` (listComments) dipakai 3 route; detail jurnal
   siswa & halaman periksa guru wali kini menyertakan `comments`.
4. **UI**: sidebar admin + halaman **Kepala Sekolah** (list/tambah/hapus);
   dashboard KS (kartu ringkasan, jurnal hari ini, verifikasi 30 hari,
   tren 7 hari, nilai per kelas); dashboard orang tua (layout+nav dengan
   badge notifikasi, daftar anak, riwayat, detail read-only + form
   komentar, halaman notifikasi); komponen `comments-list.tsx` read-only
   di halaman guru wali & siswa.
5. **Dokumentasi**: README (Fase 7 dicentang + blok catatan) dan
   tutorial-penggunaan.md (bagian Fase 7 lengkap).

Typecheck API & web lolos (`tsconfig.sandbox.json`).

## Catatan teknis sesi ini

- Proses background TIDAK bertahan antar-call bash (PID namespace per call,
  die-with-parent) — `nohup`/`setsid` percuma. tsc web hanya selesai <45 dtk
  berkat cache `tsconfig.sandbox.tsbuildinfo` (pakai `--incremental`).
  `pgrep -f` juga bisa false-positive mencocokkan wrapper call itu sendiri.
- `.git/index.lock` basi tidak bisa dihapus dari sandbox sampai izin
  penghapusan diaktifkan (tool allow_cowork_file_delete) — setelah itu
  `rm` biasa jalan.
- Semua penulisan file repo sesi ini dilakukan dari sisi sandbox
  (heredoc/python) untuk menghindari masalah mount basi sesi 1; tidak ada
  byte NUL terdeteksi.
- drizzle-kit: instalasi terpisah `/tmp/dk` + shadow copy `/tmp/gen`
  (symlink node_modules ke /tmp/dk agar config bisa import drizzle-kit).

## Rencana berikutnya

1. User: `npm run db:migrate` (migrasi 0004), lalu uji manual:
   buat akun KS (admin) → login KS → dashboard; login orang tua →
   lihat jurnal anak → kirim komentar → cek notifikasi siswa/guru wali.
2. Push ke GitHub (kini 7 commit lokal tertunda).
3. Lanjut **Fase 8 — Landing Page & polish UI/UX** (lihat README).
