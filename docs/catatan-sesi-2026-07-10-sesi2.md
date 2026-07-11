# Catatan Sesi — 10 Juli 2026 (Sesi 2)

## Selesai: Dashboard Guru Wali & Peserta Didik (kalender + diagram)

Mengikuti pola visual Pijar Sekolah (kartu ringkasan + kalender + diagram),
tanpa dependensi baru — diagram memakai pola bar div/SVG yang sudah dipakai
dashboard Kepala Sekolah.

**API (2 endpoint baru):**

- `GET /verifications/stats?date=&month=&days=` — dashboard Guru Wali:
  jumlah binaan aktif, jurnal menunggu, distribusi verifikasi `days` hari,
  tren terkirim 7 hari, rekap status jurnal binaan per tanggal (kalender).
- `GET /journals/stats?date=&month=&days=` — dashboard Peserta Didik:
  distribusi status jurnal, rata-rata nilai karakter, tren nilai 7 hari,
  status jurnal per tanggal. **PENTING:** terdaftar SEBELUM `GET /:id`
  agar `/stats` tidak tertangkap sebagai parameter id.

**Web:**

- Baru: `components/status-calendar.tsx` (kalender bulanan Senin–Minggu,
  navigasi bulan via `?bulan=YYYY-MM`, sel berwarna status + tooltip,
  legenda) dan `components/stat-widgets.tsx` (StatCard + Bar, disalin dari
  pola kepala-sekolah).
- `dashboard/guru-wali/page.tsx` — dirombak jadi Beranda: kartu ringkasan,
  kalender jurnal binaan, diagram verifikasi 30 hari + tren 7 hari, tabel
  Menunggu Verifikasi tetap di bawah. Tab nav pertama diganti "Beranda".
- `dashboard/peserta-didik/page.tsx` — kartu ringkasan, kalender jurnal
  pribadi, diagram distribusi + tren nilai karakter 7 hari.
- `peserta-didik-nav.tsx` — item **Beranda** baru (match persis, bukan
  `startsWith`) agar bisa kembali ke dashboard dari sub-halaman.
- Perbaikan crash: `createTodayJournal` kini menangkap `ApiRequestError`
  dan redirect ke `?error=` — pesan (mis. "Belum ada tahun pelajaran
  aktif") tampil sebagai kotak kuning di halaman Jurnal Hari Ini, bukan
  runtime error Next.js.

Typecheck API + web dan ESLint lolos untuk semua berkas yang diubah.

## Catatan teknis sesi ini

- **Sinkronisasi OneDrive → sandbox terpotong** (~kelipatan 4KB): file di
  Windows utuh, tapi salinan di mount sandbox terpotong dan tidak pernah
  tersinkron penuh. Verifikasi typecheck/lint dilakukan pada salinan
  rekonstruksi di `/tmp` (potongan asli diambil dari `git show HEAD:`).
  Symlink workspace `node_modules/@sjk/*` juga rusak di mount (OneDrive
  tidak membawa symlink) — diakali dengan `paths` di tsconfig bayangan.
  Pastikan OneDrive selesai sinkron sebelum commit.
- **Data belum siap untuk tahun ajaran 2026/2027**: buat jurnal gagal
  dengan `no_active_academic_year`. Urutan penyiapan oleh Admin:
  (1) aktifkan Tahun Ajaran 2026/2027 → (2) aktifkan Semester →
  (3) pastikan Template Jurnal aktif berisi item.

## Status roadmap

Fase 8 (Landing Page & polish UI/UX) **sudah selesai** sejak commit
`6f74e04` — tidak ada persiapan tersisa selain uji manual di bawah.

## Sebelum mulai Fase 9 (prasyarat)

1. Commit + push pekerjaan sesi ini (dashboard wali/siswa + fix nav/error).
2. Aktifkan tahun ajaran/semester/template 2026/2027 (lihat di atas) agar
   alur siswa bisa diuji.
3. Uji manual yang tertunda dari sesi sebelumnya, kini bertambah:
   (a) dashboard Guru Wali: kalender navigasi bulan, tooltip, diagram;
   (b) dashboard Peserta Didik: kalender + tren nilai; (c) tombol Beranda
   dari semua sub-halaman; (d) pesan error "Buat Jurnal" saat konfigurasi
   belum aktif; (e) daftar uji lama (Bukti Harian, submit + validasi foto,
   verifikasi + nilai, KS analitik, komentar orang tua, landing/404).

## Persiapan Fase 9 — Audit log, backup/restore, hardening keamanan

**1. Audit log** — tabel `audit_logs` sudah ada (migrasi awal) dan sudah
ditulis oleh rute admin (schools, teachers, students, parents, principals,
academic-years, semesters, journal-templates, teacher-student,
evidence-requirements, verifications). Yang belum:

- Cakupan: aksi siswa (buat/submit jurnal) belum dicatat; event login
  (berhasil/gagal) belum dicatat sama sekali.
- Belum ada UI viewer untuk Admin (filter per user/tabel/tanggal).
- Belum ada kebijakan retensi (usul: purge > 1 tahun via cron).

**2. Backup/restore** — belum ada apa pun. Usulan:

- Manfaatkan PITR bawaan Neon (cek retensi paket saat ini) + `pg_dump`
  terjadwal via GitHub Actions cron ke artifact/R2.
- Dokumen prosedur restore yang teruji (bukan hanya backup).
- Foto bukti di R2: rencanakan lifecycle/backup bucket terpisah.

**3. Hardening** — daftar kandidat, urut prioritas:

- **Ganti kata sandi mandiri** — sudah dijanjikan di tutorial (sandi awal
  = NISN mudah ditebak). Paling berdampak, kerjakan duluan.
- Rate limiting login & API (Cloudflare WAF/rate rules, atau middleware).
- Evaluasi Auth.js v5 (mode security-patch) vs Better Auth — trade-off
  sudah dicatat di `docs/auth-architecture.md`; keputusan sadar, bukan
  migrasi otomatis.
- Review akses foto R2 (signed URL / proteksi objek publik).
- Header keamanan (CSP, HSTS, dsb.) di web + API.
- Audit ulang matriks permission RBAC per rute (regresi sejak Fase 3).

## Revisi yang direncanakan user (eksekusi besok)

1. **Impor guru dari Excel** — permudah penambahan guru dengan impor
   Excel + sediakan file template unduhan. Acuan: pola impor siswa yang
   sudah ada (`bulk-import-students.tsx`, `students/impor`,
   `docs/bulk-import-export.md`) — tinggal direplikasi untuk guru.
2. **Login guru via NIP atau email, sandi awal = NIP** — pola sama dengan
   siswa (NISN). Konsekuensi: kolom NIP wajib unik + tombol "Reset sandi
   ke NIP" di halaman admin Guru. Catatan: risiko sandi-awal-mudah-ditebak
   yang sama dengan NISN berlaku; makin kuat alasan fitur ganti kata
   sandi mandiri didahulukan di Fase 9.
3. **Template jurnal di dashboard guru** (tidak semua bertumpu di Admin):
   - Kelola template juga bisa dari dashboard Guru (Wali).
   - "Item jurnal" diganti 7 opsi TETAP (wajib ada semua):
     Bangun Pagi; Beribadah; Berolahraga; Gemar Belajar; Makan Sehat dan
     Bergizi; Bermasyarakat (Bersosialisasi); Tidur Lebih Awal (Tidur
     Cepat) — masing-masing dengan keterangan contoh.
   - Tambah 1 opsi baru: penanda item mana yang butuh **bukti foto**
     (berupa upload link). Perhatikan tumpang-tindih dengan fitur
     Bukti Harian yang sudah ada (`evidence_requirements`, guru wali
     memilih item wajib foto PER HARI) — putuskan dulu: menggantikan,
     atau jadi default saat guru tidak menetapkan harian.
4. **Penugasan Guru Wali massal** — tambah banyak siswa sekaligus
   (multi-select), atau upload daftar NISN yang dicocokkan ke database
   peserta didik yang sudah ada (validasi: NISN tak ditemukan / sudah
   punya wali dilaporkan per baris, bukan gagal total).

## Rencana berikutnya

1. Prasyarat di atas (commit, data aktif, uji manual).
2. Eksekusi 4 revisi di atas.
3. Mulai Fase 9 dari ganti kata sandi mandiri + kelengkapan audit log.
4. Fase 10 — dokumentasi & tutorial lengkap.
