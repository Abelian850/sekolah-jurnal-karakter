# Jurnal Karakter & Monitoring Peserta Didik

Aplikasi jurnal karakter dan monitoring peserta didik berbasis relasi **Guru Wali ↔ Peserta Didik** (bukan Wali Kelas ↔ Kelas) — Guru Wali dapat membina siswa lintas kelas dan angkatan, dan penugasannya dapat berubah tanpa mengubah data siswa.

## Status Proyek

- [x] **Fase 1** — Analisis kebutuhan, pemilihan teknologi, ERD, use case, flowchart, arsitektur
- [x] **Fase 2** — Setup monorepo, konfigurasi GitHub/Cloudflare/Neon/Auth.js, CI/CD
- [x] **Fase 3** — Autentikasi & RBAC penuh + Dashboard Admin (Sekolah, Tahun Pelajaran, Semester)
- [x] **Fase 4** — Kelola Guru, Guru Wali, Peserta Didik, Orang Tua + Bulk Import/Export Excel

> ⚠️ **Pembaruan pasca-Fase 4:** Next.js dinaikkan dari 15.0.0 ke **16.2.10 LTS**
> (menambal kerentanan kritis CVE-2025-66478), dan deploy frontend berpindah
> dari Cloudflare Pages ke **Cloudflare Workers** via `@opennextjs/cloudflare`
> (`@cloudflare/next-on-pages` sudah deprecated). Detail lengkap di
> `docs/deployment.md`.
- [x] **Fase 5** — Modul Jurnal Harian (template jurnal oleh Admin, pengisian & kirim jurnal oleh Peserta Didik, riwayat)
- [ ] Fase 6 — Validasi & Penilaian Karakter + Notifikasi
- [ ] Fase 7 — Dashboard Kepala Sekolah & Orang Tua
- [ ] Fase 8 — Landing Page & polish UI/UX
- [ ] Fase 9 — Audit log, backup/restore, hardening keamanan
- [ ] Fase 10 — Dokumentasi & tutorial lengkap

## Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Hono di Cloudflare Workers |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| Storage | Cloudflare R2 |
| Auth | Auth.js (Credentials + JWT) |
| Hosting | Cloudflare Workers (FE via OpenNext, BE via Hono) |
| CI/CD | GitHub Actions |

Alasan lengkap pemilihan setiap teknologi (termasuk mengapa Neon dipilih alih-alih Supabase) ada di dokumen Fase 1.

## Struktur Monorepo

```
apps/
  web/        Next.js frontend
  api/        Hono backend (Cloudflare Workers)
packages/
  shared/     Tipe & konstanta bersama (role, permission, JWT payload)
docs/         Dokumentasi setup, deployment, environment variables, migrasi
drizzle/      File migrasi SQL (auto-generated, jangan diedit manual)
.github/      GitHub Actions workflows
```

## Mulai Cepat

Lihat [`docs/setup-lokal.md`](./docs/setup-lokal.md) untuk panduan lengkap dari nol.

```bash
npm install
npm run dev:api   # terminal 1
npm run dev:web   # terminal 2
```

## Dokumentasi

- [**Tutorial Penggunaan (per Fase)**](./docs/tutorial-penggunaan.md) — cara memakai setiap fitur, ditulis untuk pengguna (Admin/Guru/dst), bukan developer
- [Arsitektur Autentikasi (dua-token)](./docs/auth-architecture.md)
- [Bulk Import & Export Excel](./docs/bulk-import-export.md)
- [Setup Lokal](./docs/setup-lokal.md)
- [Environment Variables](./docs/environment-variables.md)
- [Deployment & CI