# Deployment & CI/CD

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
        │                         2. deploy ke Cloudflare Workers (wrangler deploy)
        └── deploy-web.yml     → jika ada perubahan di apps/web atau packages/shared:
                                  1. build Next.js untuk Cloudflare Pages
                                  2. deploy ke Cloudflare Pages
```

Setiap workflow hanya berjalan jika ada perubahan file yang relevan (lihat `paths:` di masing-masing file workflow), agar tidak boros build minutes GitHub Actions.

## Setup awal (dilakukan sekali)

1. **Buat project Cloudflare Pages** dari dashboard, hubungkan ke repo GitHub (atau biarkan GitHub Actions yang deploy langsung tanpa integrasi native Pages — sudah dikonfigurasi di `deploy-web.yml`).
2. **Buat Worker** dengan nama sesuai `wrangler.toml` (`sjk-api-production`), bisa dibuat otomatis oleh `wrangler deploy` pertama kali.
3. **Isi seluruh GitHub Secrets** sesuai `docs/environment-variables.md`.
4. **Push ke branch main** → kedua workflow deploy akan berjalan otomatis.

## Batas free tier yang perlu dipantau

| Layanan | Batas free tier (Juli 2026) | Tindakan jika mendekati batas |
|---|---|---|
| Cloudflare Workers | 100.000 request/hari | Monitor di dashboard Workers Analytics; jika mendekati, evaluasi apakah ada polling berlebihan di frontend |
| Cloudflare Pages | Build tak terbatas dalam batas wajar | Tidak perlu tindakan untuk skala satu sekolah |
| Cloudflare R2 | 10 GB-month storage, 1 juta Class A ops/bulan | Pastikan kompresi foto di sisi klien aktif (wajib, lihat Fase 1 Bab 4.3) |
| Neon | 100 CU-hours/bulan per project, 0,5 GB storage per project | Monitor di dashboard Neon; karena scale-to-zero otomatis, risiko utama hanya jika traffic sangat tinggi terus-menerus |
| GitHub Actions | 2.000 menit/bulan (akun gratis) | Workflow sudah dibatasi `paths:` agar hanya jalan saat relevan |

## Rollback

- **Cloudflare Workers**: `npx wrangler rollback --env production` mengembalikan ke deployment sebelumnya.
- **Cloudflare Pages**: dari dashboard Pages → Deployments → pilih deployment lama → "Rollback to this deployment".
- **Database**: Neon menyediakan *point-in-time restore* dari console (lihat `docs/database-migration.md` untuk detail backup/restore).
