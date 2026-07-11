# Bulk Import & Export Excel

## Keputusan desain: parsing/generate file dilakukan di browser, bukan di server

Backend (`apps/api`) berjalan di **Cloudflare Workers**, sebuah runtime V8
isolate yang jauh lebih terbatas dibanding Node.js biasa: tidak ada
filesystem, ukuran bundle dan waktu eksekusi dibatasi ketat, dan beberapa
library pemrosesan file biner (seperti SheetJS versi penuh) tidak selalu
kompatibel atau efisien di lingkungan ini.

Karena itu, alur bulk import/export dirancang seperti ini:

```
IMPORT:
  Admin pilih file .xlsx di browser
        │
        ▼
  SheetJS mem-parsing file JADI JSON di browser (components/bulk-import-students.tsx)
        │
        ▼
  Array JSON (bukan file mentah) dikirim ke Server Action Next.js
        │
        ▼
  Server Action memanggil POST /students/bulk di Hono (Cloudflare Workers)
        │
        ▼
  Setiap baris diproses satu per satu: buat user + hash password + insert profil
        │
        ▼
  Ringkasan sukses/gagal per baris dikembalikan ke browser

EXPORT:
  Admin klik "Export Excel"
        │
        ▼
  Data yang sudah diambil server-side (Server Component) diteruskan sebagai prop
        │
        ▼
  SheetJS membentuk workbook LANGSUNG DI BROWSER dan memicu unduhan
```

**Konsekuensi trade-off:**
- ✅ Backend Cloudflare Workers tidak perlu menangani file biner besar sama sekali — hanya menerima array JSON yang sudah bersih dan tervalidasi (Zod).
- ✅ Tidak ada batas ukuran file yang bergantung pada limit Workers (100 ribu request/hari tetap berlaku, tapi tidak ada beban khusus parsing Excel).
- ⚠️ Validasi format Excel (nama kolom, tipe data) terjadi di browser sebelum data terkirim — pesan error jika format salah harus jelas (lihat `parseError` di komponen).
- ⚠️ Baris diproses satu per satu di backend (bukan satu transaksi besar), karena keterbatasan transaksi interaktif Neon HTTP driver (lihat `apps/api/src/services/user-provisioning.ts`). Jika 500 dari 500 baris gagal karena satu kesalahan sistemik (mis. DATABASE_URL salah), semuanya akan gagal satu per satu — bukan cepat gagal di baris pertama. Untuk Fase 4 ini dianggap dapat diterima karena skala data (~100-1000 baris) tetap wajar diproses dalam beberapa detik.

## Format kolom yang didukung saat ini

**Import Peserta Didik** (`/dashboard/admin/siswa/impor`):
```
nis | nisn | fullName | className | gradeLevel | gender | birthDate
```

**Import Guru** (`/dashboard/admin/guru/impor`, revisi Juli 2026):
```
nip | fullName | email | phone | isGuruWali
```

> Hanya `nip` (5-30 digit angka, wajib unik) dan `fullName` yang wajib.
> Akun login dibuat otomatis: username = **NIP**, kata sandi awal = **NIP**,
> email internal `<nip>@guru.internal` jika kolom email kosong (lihat
> `packages/shared/src/teachers.ts`). `isGuruWali` menerima `ya`/`tidak`,
> `true`/`false`, `1`/`0`. Template contoh dapat diunduh langsung dari
> halaman impor (tombol "Unduh Template Excel") atau di
> [`docs/templates/template-import-guru.xlsx`](./templates/template-import-guru.xlsx).

> **Pembaruan pasca-Fase 6:** kolom `email` dan `password` DIHAPUS. Akun
> login siswa dibuat otomatis oleh backend: username = **NISN**, kata sandi
> awal = **NISN**, email internal = `<nisn>@siswa.internal` (lihat
> `packages/shared/src/students.ts`). `nisn` kini **wajib & unik** (5-30
> digit angka). NIS/NISN yang terbaca Excel sebagai angka dinormalisasi ke
> string di browser sebelum dikirim.

**Import Guru**: mengikuti pola yang sama (`POST /teachers/bulk` di backend sudah tersedia),
komponen UI-nya dapat ditambahkan mengikuti pola `bulk-import-students.tsx` bila dibutuhkan.

## Hapus Massal Peserta Didik (Juli 2026)

**Halaman**: `/dashboard/admin/siswa/hapus-massal` — **Endpoint**: `POST /students/bulk-delete`

Admin mengunggah file Excel berisi kolom `nisn` (kolom lain diabaikan, jadi
file hasil "Export Excel" bisa langsung dipakai setelah baris siswa yang
TIDAK ingin dihapus dibuang). Pola sama dengan impor: parsing di browser
(`components/bulk-delete-students.tsx`), array NISN dikirim ke Server Action
(`siswa/hapus-massal/actions.ts`), diproses per baris di backend.

Keputusan desain:
- **Hanya NISN, bukan nama** — nama tidak unik dan rawan salah ketik.
- **Proteksi jurnal** — siswa yang sudah punya jurnal dilewati per baris
  (proteksi yang sama dengan `DELETE /students/:id`), demi menjaga riwayat
  pengisian dan nilai. Untuk siswa lulus, gunakan fitur Kelulusan
  (nonaktifkan, jangan hapus), bukan fitur ini.
- Menghapus baris `users` -> cascade ke `students` dan relasi turunannya;
  satu baris `audit_logs` per siswa terhapus.
- NISN duplikat dan nilai non-NISN disaring di browser sebelum dikirim;
  konfirmasi `window.confirm` menyebut jumlah siswa yang akan dihapus.

## Menambah bulk import untuk entitas lain

Ikuti pola yang sama persis:
1. Tambah endpoint `POST /<entitas>/bulk` di `apps/api` (contoh: `routes/students.ts`)
2. Buat komponen client baru meniru `components/bulk-import-students.tsx`, ganti tipe kolom
3. Buat Server Action baru meniru `app/dashboard/admin/siswa/impor/actions.ts`
