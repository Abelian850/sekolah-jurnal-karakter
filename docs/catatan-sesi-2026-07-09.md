# Catatan Sesi — 9 Juli 2026

## Selesai hari ini: Requirement 7 Kebiasaan Anak Indonesia Hebat

Keputusan desain (dikonfirmasi user):

- Guru Wali memilih kebiasaan wajib berbukti **PER HARI** (bukan per
  periode/per siswa), berlaku untuk semua siswa binaannya.
- **Fallback** jika guru belum menetapkan: siswa tetap wajib melampirkan
  minimal satu foto pada kebiasaan mana pun (submit tidak pernah terblokir
  karena guru lupa).

Implementasi:

1. **Skema & migrasi `0003`** — tabel `evidence_requirements`
   (teacher_id, requirement_date, template_item_id; unik per guru+tanggal).
   Migrasi BELUM dijalankan ke Neon — user perlu `npm run db:migrate`.
2. **API `/evidence-requirements`** (GET/PUT/DELETE, permission
   JOURNAL_VERIFY) — guru set/lihat/hapus pilihan per tanggal; PUT
   memvalidasi item milik template aktif sekolah guru; audit log dicatat.
3. **Validasi submit** (`journals.ts` PATCH /:id/submit):
   - Aturan 1: semua item terisi — status "belum" wajib berketerangan
     (422 `incomplete_items`).
   - Aturan 2: wajib 1 foto — pada item yang diwajibkan guru
     (422 `missing_required_photo`); jika item wajib berstatus "belum"
     (berketerangan) atau guru belum menetapkan → fallback foto bebas
     (422 `missing_photo`).
   - Respons today/:id/POST kini menyertakan `evidenceRequirement`.
4. **UI Guru Wali** — tab baru **Bukti Harian** (pilih tanggal + radio item
   + simpan/hapus); halaman periksa verifikasi menampilkan badge kebiasaan
   yang diwajibkan pada tanggal jurnal.
5. **UI Siswa** (`journal-items-form.tsx` dirombak) — kolom keterangan &
   foto (URL) di SEMUA item, badge "Wajib foto hari ini", banner info, dan
   validasi pra-kirim di klien yang mereplikasi aturan server (hanya nilai
   TERSIMPAN yang dihitung).
6. **Dokumentasi** — README (blok pembaruan pasca-Fase 6 + perbaikan baris
   terakhir yang terpotong) & tutorial-penggunaan.md (bagian baru).

Typecheck API & web lolos (pakai `tsconfig.sandbox.json` di apps/api &
apps/web — boleh dihapus, hanya untuk sandbox Linux).

## Masalah teknis sesi ini (penting untuk sesi berikutnya)

- **Mount sandbox menyajikan konten basi** untuk file yang SUDAH pernah
  dibaca sandbox lalu diedit dari sisi Windows (metadata ukuran lama →
  file terbaca terpotong). File BARU aman. Solusi yang dipakai: tulis
  ulang file tsb dari sisi sandbox (heredoc) dengan konten identik.
  JANGAN commit dari sandbox sebelum memastikan `wc -l` file yang diedit
  masuk akal.
- File yang dibuat via tool Write kadang berekor byte NUL di mount —
  sudah dibersihkan (`tr -d '\000'`); cek dengan `grep -qP '\x00'`.
- drizzle-kit dijalankan dari instalasi terpisah `/tmp/dk` + shadow copy
  schema di `/tmp/gen` (esbuild node_modules repo ter-install untuk
  Windows + masalah mount di atas).
- `.shadow-schema.ts` di root repo adalah sisa workaround — SUDAH tidak
  dipakai, hapus manual (penghapusan dari sandbox diblokir).

## Rencana berikutnya

1. User: jalankan `npm run db:migrate` (migrasi 0003), lalu uji manual
   alur Bukti Harian + submit siswa.
2. Push ke GitHub masih tertunda (kini 5+ commit lokal).
3. Lanjut **Fase 7 — Dashboard Kepala Sekolah & Orang Tua** (backend
   notifikasi orang tua sudah ada sejak Fase 6; `resolveSchoolId` di
   apps/web/lib/auth.ts belum memodelkan sekolah untuk kepala_sekolah).
