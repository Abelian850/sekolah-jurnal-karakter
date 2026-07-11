# Catatan Sesi — 11 Juli 2026

## Selesai: 4 revisi yang direncanakan (lihat catatan 10 Juli sesi 2)

**1. Impor guru dari Excel + template** (`c3fd95f`)

- Halaman `/dashboard/admin/guru/impor` + `components/bulk-import-teachers.tsx`
  (pola sama dengan impor siswa: parsing SheetJS di browser).
- Kolom: `nip | fullName | email | phone | isGuruWali` — hanya nip &
  fullName wajib; `isGuruWali` menerima ya/tidak/true/false/1/0.
- Template unduhan: tombol "Unduh Template Excel" di halaman impor
  (digenerate di browser) + `docs/templates/template-import-guru.xlsx`.

**2. Login guru via NIP/email, sandi awal = NIP** (`c3fd95f`)

- `packages/shared/src/teachers.ts`: `nipToEmail` (`<nip>@guru.internal`),
  `NIP_REGEX` (5-30 digit, longgar untuk NI PPPK/NUPTK).
- **Migrasi 0005**: `teachers.nip` UNIQUE — *cek duplikat NIP di data lama
  sebelum `npm run db:migrate`, constraint gagal jika ada duplikat.*
- API: POST /teachers & /bulk tanpa password (sandi awal = NIP, email
  opsional), PATCH `/:id/reset-password` (reset ke NIP) + tombol di
  halaman admin Guru.
- Auth.js: identifier tanpa "@" dicoba sebagai NISN dulu, lalu NIP.
- Bug laten diperbaiki: web memanggil `toggle-guru-wali`, rute API-nya
  `toggle-wali` — tombol ubah status wali tidak pernah bekerja.

**3. Template jurnal: 7 item tetap + bukti foto + dashboard Guru Wali** (`3064163`)

- `packages/shared/src/journal-items.ts`: `FIXED_JOURNAL_ITEMS` — 7
  Kebiasaan (Bangun Pagi; Beribadah; Berolahraga; Gemar Belajar; Makan
  Sehat dan Bergizi; Bermasyarakat (Bersosialisasi); Tidur Lebih Awal
  (Tidur Cepat)), masing-masing dengan keterangan contoh yang juga tampil
  ke siswa saat mengisi jurnal.
- **Migrasi 0006**: `journal_template_items` + `description` +
  `requires_photo`.
- Create template wajib memuat 7 item tetap (validasi zod superRefine);
  item tetap tidak bisa dihapus; item tambahan tetap boleh.
- **Keputusan user**: penanda `requiresPhoto` di template = DEFAULT;
  Bukti Harian per tanggal (evidence_requirements) tetap MENANG.
  Konsekuensi kontrak API: `evidenceRequirement` (tunggal) →
  `evidenceRequirements` (array + `source: "harian"|"template"`) di
  journals & verifications; validasi submit kini per-item wajib
  (yang dikerjakan harus berfoto; "belum" berketerangan dikecualikan;
  tanpa item wajib → fallback minimal 1 foto bebas).
- Guru Wali dapat `JOURNAL_TEMPLATE_MANAGE`; rute journal-templates
  di-scope: non-admin dikunci ke `schoolId` JWT (404 untuk sekolah lain).
- Web: tab "Template Jurnal" baru di dashboard Guru Wali (list/baru/[id]);
  komponen kelola template & server actions dibagi dua dashboard
  (`components/journal-template-detail.tsx`, `lib/template-actions.ts`
  dengan bind basePath). Form buat template: 7 item terkunci + centang
  "Wajib foto" + item tambahan.

**4. Penugasan Guru Wali massal** (`00bceff`)

- API `POST /teacher-student/bulk`: multi-select (studentIds) dan/atau
  daftar NISN; laporan per baris (NISN tak ditemukan / sudah punya wali /
  duplikat). SENGAJA tidak pernah memindahkan binaan guru lain — pemindahan
  tetap lewat form tunggal.
- Web: halaman penugasan jadi dua panel — massal (checkbox + pencarian,
  atau upload .xlsx kolom `nisn` / tempel daftar) + tunggal (lama).

Juga: perbaikan `BufferSource` di `password.ts` (typecheck gagal di lib
tsconfig shared) dan `tsconfig.check.json` per app (paths @sjk/*) supaya
typecheck bisa jalan di sandbox tanpa symlink workspace.

## Yang harus dilakukan user (belum bisa dari sandbox)

1. **Push**: 4 commit lokal belum ter-push (sandbox tanpa kredensial
   GitHub): `5b6528f`, `c3fd95f`, `3064163`, `00bceff`.
2. **Jalankan migrasi** 0005 + 0006 (`npm run db:migrate`) — cek dulu
   duplikat NIP (lihat atas).
3. Data 2026/2027 tetap prasyarat uji (tahun ajaran, semester, template
   aktif — template baru kini otomatis berisi 7 item tetap).

## Uji manual (bertambah dari daftar 10 Juli)

(a) impor guru + unduh template + baris gagal per-baris; (b) login guru
pakai NIP & reset sandi ke NIP; (c) buat template dari dashboard Guru Wali
(cek terkunci 7 item, centang wajib foto, tidak bisa hapus item tetap,
tidak bisa lihat template sekolah lain); (d) siswa: keterangan contoh
tampil, item wajib foto ditandai, submit ditolak tanpa foto pada item
wajib, Bukti Harian menang atas default template; (e) penugasan massal
dua mode + laporan gagal per baris; (f) toggle status Guru Wali (dulu bug);
(g) daftar uji lama sesi 10 Juli.

## Catatan teknis sesi ini

- Sinkronisasi OneDrive→sandbox masih bermasalah: `password.ts` dan
  snapshot meta drizzle terpotong di mount. Solusi sesi ini: tulis file
  dari sisi sandbox (bukan Windows), rekonstruksi meta dari `git show`,
  dan drizzle-kit dijalankan di salinan /tmp (drizzle-kit repo ^0.24.2
  tidak bisa membaca snapshot 0003+ yang ternyata dibuat kit lebih baru —
  pakai drizzle-kit@latest di /tmp).
- File lock git (`index.lock` dkk) sempat tersangkut di mount; teratasi
  setelah izin hapus file diaktifkan untuk folder ini.
- `docs/tutorial-penggunaan.md` BELUM diperbarui untuk 4 revisi ini —
  masuk Fase 10 (dokumentasi lengkap).

## Rencana berikutnya

1. Push + migrasi + uji manual di atas.
2. Mulai Fase 9: ganti kata sandi mandiri (makin penting — sandi awal
   guru = NIP), kelengkapan audit log, backup/restore, hardening
   (lihat persiapan di catatan 10 Juli sesi 2).
