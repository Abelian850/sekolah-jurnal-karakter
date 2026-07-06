# Deployment & CI/CD

> **Pembaruan penting (dicatat agar tidak membingungkan saat baca ulang):**
> Rencana awal Fase 1 adalah frontend di **Cloudflare Pages** lewat
> `@cloudflare/next-on-pages`. Paket itu kemudian **resmi deprecated** oleh
> Cloudflare, digantikan `@opennextjs/cloudflare` yang men-deploy Next.js
> sebagai **Cloudflare Worker** (sama seperti backend Hono), bukan lagi ke
> Cloudflare Pages. Alasan teknisnya: `@opennextjs/cloudflare` mendukung
> runtime Node.js penuh (bukan Edge Runtime yang serba terbatas), dan sejak
> Next.js 16.2 ini didukung lewat Adapter API resmi hasil kolaborasi
> Vercel-Cloudflare-Netlify-AWS, bukan lagi reverse-engineering komunitas.
> Dokumen ini sudah mencerminkan arsitektur yang benar (kedua aplikasi
> sama-sama di Cloudflare Workers).

## Alur otomatis

```
push ke branch main
        │
        ▼
GitHub Actions terpicu
        │
        ├── ci.yml            → lint + typecheck (semua push/PR)
        ├── deploy-api.yml     → jika ada perubahan di apps/api atau packages/shared:
        │                         1. migrasi Neon (npm run db:migrate)
        │                         2. deploy ke Cloudflare Workers "sjk-api-production" (wrangler deploy)
        └── deploy-web.yml     → jika ada perubahan di apps/web atau packages/shared:
                                  1. build dengan OpenNext Cloudflare adapter (opennextjs-cloudflare build)
                                  2. deploy ke Cloudflare Workers "sjk-web-production" (wrangler deploy)
```

Kedua aplikasi (frontend & backend) kini sama-sama berjalan sebagai
**Cloudflare Worker terpisah** (`sjk-web-production` dan
`sjk-api-production`), masing-masing dengan `wrangler.toml` sendiri di
folder `apps/web` dan `apps/api`.

## Setup awal (dilakukan sekali)

1. **Buat R2 bucket tambahan** `sjk-web-cache` (dipakai OpenNext untuk cache
   halaman/ISR) selain `sjk-journal-photos` yang sudah ada dari Fase 1.
2. Kedua Worker (`sjk-web-production`, `sjk-api-production`) akan otomatis
   dibuat oleh `wrangler deploy` pertama kali dari GitHub Actions.
3. **Isi seluruh GitHub Secrets** sesuai `docs/environment-variables.md`.
4. **Push ke branch main** → kedua workflow deploy berjalan otomatis.

## Batas free tier yang perlu dipantau

| Layanan | Batas free tier (Juli 2026) | Tindakan jika mendekati batas |
|---|---|---|
| Cloudflare Workers | 100.000 request/hari **digabung untuk SEMUA Worker di akun** (bukan per-Worker) — sekarang `sjk-web` dan `sjk-api` berbagi kuota yang sama | Monitor gabungan kedua Worker di dashboard Analytics; ini kuota yang paling penting dipantau sekarang karena frontend ikut menghitung |
| Cloudflare R2 | 10 GB-month storage, 1 juta Class A ops/bulan | Pastikan kompresi foto di sisi klien aktif (wajib, lihat Fase 1 Bab 4.3); cache OpenNext di `sjk-web-cache` juga ikut memakai kuota ini |
| Neon | 100 CU-hours/bulan per project, 0,5 GB storage per project | Monitor di dashboard Neon; karena scale-to-zero otomatis, risiko utama hanya jika traffic sangat tinggi terus-menerus |
| GitHub Actions | 2.000 menit/bulan (akun gratis) | Workflow sudah dibatasi `paths:` agar hanya jalan saat relevan |

**Perhatian khusus:** karena frontend kini juga Worker (bukan Pages, yang
punya kuota request terpisah dan lebih longgar), total trafik gabungan
`sjk-web` + `sjk-api` sekarang berbagi satu kuota 100 ribu request/hari.
Untuk skala satu sekolah ini masih jauh dari batas, tapi perlu diingat jika
nanti menaungi beberapa sekolah sekaligus dalam satu yayasan.

## Rollback

- **Cloudflare Workers** (berlaku untuk `sjk-web` maupun `sjk-api`):
  `npx wrangler rollback --env production` di folder masing-masing aplikasi,
  mengembalikan ke deployment sebelumnya.
- **Database**: Neon menyediakan *point-in-time restore* dari console (lihat
  `docs/database-migration.md` untuk detail backup/restore).
