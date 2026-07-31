# Panduan untuk Penerima Aplikasi Sekolah Jurnal Karakter

Panduan ini untuk Anda yang baru menerima salinan aplikasi ini dan ingin
menjalankannya untuk sekolah Anda sendiri. Ditulis dengan bahasa sederhana —
untuk detail teknis lengkap, lihat `docs/setup-lokal.md` dan
`docs/environment-variables.md`.

> **Penting:** Salinan ini TIDAK berisi data siswa atau kunci rahasia milik
> sekolah asal. Anda akan membuat database dan kunci rahasia Anda sendiri.
> Data sekolah Anda sepenuhnya milik Anda.

---

## Apa saja yang perlu Anda siapkan?

Semua gratis, tanpa kartu kredit:

1. **Node.js 20 atau lebih baru** — unduh dari https://nodejs.org
2. **Akun Neon** (database) — daftar di https://neon.tech
3. **Akun Cloudflare** (hosting, hanya perlu saat online-kan aplikasi) — https://cloudflare.com
4. **Akun GitHub** (hanya perlu jika ingin deploy otomatis)

---

## Memahami "kode rahasia" yang harus diisi

Aplikasi ini butuh 3 nilai rahasia. Anda yang membuat nilainya sendiri —
tidak ada yang perlu diminta dari siapa pun.

| Nama | Apa itu? | Dari mana nilainya? |
|---|---|---|
| `DATABASE_URL` | Alamat + kata sandi database Anda | Diberikan otomatis oleh Neon saat Anda membuat project |
| `AUTH_SECRET` | Kunci pengaman login (acak) | Anda buat sendiri, string acak minimal 32 karakter |
| `NEXT_PUBLIC_API_URL` | Alamat server API | Saat lokal: `http://localhost:8787` |

**Aturan emas:** `DATABASE_URL` dan `AUTH_SECRET` harus **sama persis** di
kedua file yang akan Anda isi. Jika beda satu huruf saja, login tidak akan
berfungsi.

---

## Langkah 1 — Pasang aplikasi

Buka terminal (Command Prompt / PowerShell / Terminal) di folder aplikasi, lalu:

```bash
npm install
```

Tunggu sampai selesai (beberapa menit saat pertama kali).

## Langkah 2 — Buat database di Neon

1. Masuk ke https://neon.tech → **New Project** → beri nama bebas (mis. `sekolah-saya`).
2. Setelah project jadi, Neon menampilkan **connection string** — teks panjang
   yang diawali `postgresql://...`. Salin teks ini. Inilah `DATABASE_URL` Anda.

## Langkah 3 — Buat AUTH_SECRET Anda sendiri

Pilih salah satu cara:

- **Punya Git di Windows / pakai Mac/Linux:** jalankan di terminal:
  ```bash
  openssl rand -base64 32
  ```
- **Cara termudah di Windows:** jalankan di PowerShell:
  ```powershell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
  ```
- **Cara manual:** ketik sendiri 40+ karakter acak (huruf besar-kecil, angka,
  simbol). Jangan pakai kata yang bisa ditebak.

Salin hasilnya. Inilah `AUTH_SECRET` Anda. **Simpan baik-baik dan jangan
bagikan ke siapa pun.**

## Langkah 4 — Isi kedua file konfigurasi

Ada dua file contoh yang harus Anda salin lalu isi:

**File pertama — backend (API):**

1. Buka folder `apps/api/`
2. Salin file `.dev.vars.example`, ganti namanya menjadi `.dev.vars`
3. Buka dengan Notepad/VS Code, isi:
   ```
   DATABASE_URL="hasil-salin-dari-Neon"
   AUTH_SECRET="hasil-dari-Langkah-3"
   FRONTEND_ORIGIN="http://localhost:3000"
   ```

**File kedua — frontend (web):**

1. Buka folder `apps/web/`
2. Salin file `.env.example`, ganti namanya menjadi `.env.local`
3. Isi:
   ```
   DATABASE_URL="SAMA PERSIS dengan file pertama"
   AUTH_SECRET="SAMA PERSIS dengan file pertama"
   NEXT_PUBLIC_API_URL="http://localhost:8787"
   ```

> Kedua file ini sengaja tidak ikut ter-copy ke git (sudah masuk `.gitignore`).
> Jangan pernah mengirim isi kedua file ini ke orang lain.

## Langkah 5 — Siapkan tabel database

Masih di folder utama aplikasi:

```bash
npm run db:generate
npm run db:migrate
```

Perintah ini membuat semua tabel yang dibutuhkan di database Neon Anda.

## Langkah 6 — Jalankan aplikasi

Buka **dua** terminal:

Terminal 1 (backend):
```bash
npm run dev:api
```
Backend berjalan di http://localhost:8787

Terminal 2 (frontend):
```bash
npm run dev:web
```
Buka http://localhost:3000 di browser — aplikasi siap dipakai.

**Cek cepat backend sehat:** buka http://localhost:8787/health di browser,
harus muncul `{"status":"ok","database":"connected",...}`.

## Langkah 7 — Buat akun admin pertama

Database Anda masih kosong, jadi akun admin pertama dibuat manual.
Ikuti bagian **"Membuat akun admin pertama"** di `docs/setup-lokal.md`
(memakai `npm run db:studio`).

## Langkah 8 (opsional) — Online-kan aplikasi

Jika ingin aplikasi bisa diakses guru/orang tua dari mana saja (bukan hanya
komputer Anda), ikuti `docs/deployment.md`. Ringkasnya: aplikasi di-deploy ke
Cloudflare Workers, dan kunci rahasia diisi lewat perintah
`npx wrangler secret put AUTH_SECRET` — bukan lewat file.

---

## Masalah umum

| Gejala | Penyebab paling umum |
|---|---|
| Tidak bisa login / langsung terlempar keluar | `AUTH_SECRET` di `.dev.vars` dan `.env.local` tidak sama persis |
| `database: "disconnected"` di /health | `DATABASE_URL` salah salin, atau project Neon sedang suspend (buka dashboard Neon sekali agar bangun) |
| `npm run db:migrate` gagal | `DATABASE_URL` belum diisi di `apps/api/.dev.vars` |
| Halaman web error memanggil API | Backend (Terminal 1) belum jalan, atau `NEXT_PUBLIC_API_URL` salah |

Untuk mengimpor data guru dan siswa, gunakan template di `docs/templates/`
dan panduan `docs/bulk-import-export.md`.
