# Setup Lokal

## Prasyarat

- Node.js 20+
- Akun [Neon](https://neon.tech) (gratis, tanpa kartu kredit)
- Akun [Cloudflare](https://cloudflare.com) (gratis)
- Akun GitHub
- CLI `wrangler` (terpasang otomatis lewat `npm install` sebagai devDependency)

## 1. Clone & install

```bash
git clone <url-repo-anda>
cd sekolah-jurnal-karakter
npm install
```

Karena ini monorepo npm workspaces, satu `npm install` di root sudah menginstal dependency `apps/web`, `apps/api`, dan `packages/shared` sekaligus.

## 2. Buat database Neon

1. Buat project baru di dashboard Neon → catat **connection string** (format `postgresql://...`).
2. Salin `apps/api/.dev.vars.example` menjadi `apps/api/.dev.vars`, isi `DATABASE_URL`.
3. Salin `apps/web/.env.example` menjadi `apps/web/.env.local`, isi `DATABASE_URL` yang **sama persis**.
4. Generate `AUTH_SECRET` (contoh: `openssl rand -base64 32`), isi ke kedua file dengan nilai **yang sama persis**. Ini krusial — Auth.js (web) dan middleware verifikasi JWT (api) harus memakai secret identik.

## 3. Jalankan migrasi database

```bash
npm run db:generate   # generate file migrasi SQL dari schema.ts
DATABASE_URL="<connection-string-neon>" npm run db:migrate
```

## 4. Jalankan backend (Hono di Workers, lokal)

```bash
npm run dev:api
# berjalan di http://localhost:8787
```

Cek dengan: `curl http://localhost:8787/health` → harus mengembalikan `{"status":"ok","database":"connected",...}`.

## 5. Jalankan frontend (Next.js)

```bash
npm run dev:web
# berjalan di http://localhost:3000
```

Ini memakai dev server Next.js biasa (paling cepat untuk iterasi harian).
Jika suatu saat perlu menguji perilaku yang spesifik ke runtime Cloudflare
Workers (mis. binding R2, cache OpenNext), jalankan dari `apps/web`:
```bash
npm run preview
```
Ini membangun lewat adapter OpenNext lalu menjalankannya di runtime Workers
lokal (`wrangler dev` di balik layar) — lebih lambat dari `next dev`, jadi
cukup dipakai sesekali untuk verifikasi, bukan untuk kerja sehari-hari.

## 6. Membuat akun admin pertama (seed manual)

Sebelum modul Admin (Fase 3) tersedia, buat akun admin pertama langsung lewat `db:studio`:

```bash
npm run db:studio
```

Buka Drizzle Studio di browser, lalu:
1. Insert satu baris di tabel `roles` untuk setiap nilai role (admin, kepala_sekolah, guru_wali, guru, orang_tua, peserta_didik).
2. Insert satu baris di tabel `users` dengan `role_id` = admin. Untuk `password_hash`, generate lewat Node REPL:
   ```js
   const { hashPassword } = await import("./packages/shared/src/password.ts");
   console.log(await hashPassword("kata-sandi-anda"));
   ```
3. Insert satu baris di tabel `schools` untuk sekolah pertama.

Langkah ini akan digantikan oleh UI onboarding admin di Fase 3.
