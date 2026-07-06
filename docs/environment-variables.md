# Environment Variables

## apps/api (Cloudflare Workers)

Di-set lewat `wrangler secret put <NAMA>` (bukan di `wrangler.toml`, karena itu di-commit ke git):

| Nama | Contoh nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/sjk?sslmode=require` | Connection string Neon |
| `AUTH_SECRET` | string acak 32+ karakter | **Harus identik** dengan `AUTH_SECRET` di apps/web |
| `FRONTEND_ORIGIN` | `https://sjk-web.pages.dev` | Dipakai untuk konfigurasi CORS |

Cara set (contoh lokal, untuk staging/production dilakukan otomatis oleh GitHub Actions):
```bash
cd apps/api
npx wrangler secret put DATABASE_URL --env production
npx wrangler secret put AUTH_SECRET --env production
npx wrangler secret put FRONTEND_ORIGIN --env production
```

Binding non-secret (R2 bucket) sudah didefinisikan di `wrangler.toml` sebagai `JOURNAL_BUCKET`.

## apps/web (Cloudflare Workers, via OpenNext adapter)

Di-set lewat `wrangler secret put <NAMA>` di folder `apps/web` (sama polanya
dengan apps/api sejak migrasi dari Cloudflare Pages ke Workers — lihat
catatan di `docs/deployment.md`), atau lewat GitHub Secrets yang diteruskan
workflow `deploy-web.yml`:

| Nama | Keterangan |
|---|---|
| `DATABASE_URL` | Sama dengan yang dipakai apps/api |
| `AUTH_SECRET` | **Harus identik** dengan `AUTH_SECRET` di apps/api |
| `NEXT_PUBLIC_API_URL` | URL publik Workers API, contoh `https://sjk-api-production.<subdomain>.workers.dev` |

## GitHub Secrets yang wajib diisi (Settings → Secrets and variables → Actions)

| Nama | Sumber |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Dashboard Cloudflare → My Profile → API Tokens → buat token dengan scope "Edit Cloudflare Workers" + "Edit Cloudflare Pages" |
| `CLOUDFLARE_ACCOUNT_ID` | Dashboard Cloudflare → Workers & Pages → Account ID (kanan atas) |
| `DATABASE_URL` | Connection string Neon (project production) |
| `AUTH_SECRET` | String acak, sama dengan yang dipakai di kedua environment |
| `FRONTEND_ORIGIN` | URL Worker frontend production, contoh `https://sjk-web-production.<subdomain>.workers.dev` |
| `NEXT_PUBLIC_API_URL` | URL Cloudflare Workers production |

**Prinsip keamanan:** tidak ada satupun nilai di atas yang boleh muncul di kode yang di-commit. Semua lewat secrets/`.dev.vars`/`.env.local` yang sudah ada di `.gitignore`.
