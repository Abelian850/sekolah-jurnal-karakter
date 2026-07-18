# Rencana Kerja — Sabtu, 18 Juli 2026

## Konteks (hasil sesi 17 Juli)

- Data contoh dihapus permanen dari database. Tersisa: `roles` (6) + 1 akun admin `admin30@sekolah.com`.
- Database dimigrasi ke project Neon baru region **Singapore (ap-southeast-1)**, project `delicate-queen-81858224` — mengatasi delay login akibat latensi ke us-east-1.
- 22 tabel (8 migrasi Drizzle) + tracking `__drizzle_migrations` sudah terpasang di DB baru.
- `DATABASE_URL` lokal (`apps/api/.dev.vars` & `apps/web/.env.local`) sudah menunjuk DB baru.
- Project Neon lama (us-east-1) **masih ada** — jangan dihapus sebelum produksi terbukti jalan.

## Prioritas 1 — Finalisasi migrasi (±15 menit)

1. [x] Update secret `DATABASE_URL` di GitHub — SELESAI 17 Juli.
2. [x] Deploy: push `339785f` (Deploy Web #13) + re-run Deploy API #9 sukses — produksi (web & api worker) sudah menunjuk DB Singapore.
3. [ ] Uji login produksi dengan `admin30@sekolah.com` — bandingkan kecepatannya.
4. [ ] Uji login lokal (`npm run dev:web` + `dev:api`).
5. [ ] Setelah semua terbukti jalan: hapus project Neon lama (us-east-1) agar tidak membingungkan.

## Prioritas 2 — Mulai Fase 9 (hardening)

Urutan yang disarankan:

1. [x] **Ganti kata sandi mandiri** — SELESAI 18 Juli. Endpoint `PATCH /me/password` (verifikasi sandi lama, tolak hash argon2 lama dengan pesan jelas, audit log tanpa hash) + halaman `/dashboard/profil` (semua peran) + tombol "Ubah Sandi" di Topbar.
2. [ ] **Kelengkapan audit log** — baru terpasang di modul kelulusan/kenaikan; tambahkan ke login (isi `last_login_at`), CRUD user, verifikasi jurnal, dan perubahan settings.
3. [ ] **Backup/restore** — minimal dokumentasikan prosedur export via Neon (atau branch snapshot); Free plan punya point-in-time restore terbatas.
4. [ ] **Hardening** — rate limiting login (Workers), validasi ukuran/jenis file upload foto bukti, review CORS `FRONTEND_ORIGIN`.

## Prioritas 3 — Fitur baru: siswa paling rajin mengisi jurnal

1. [ ] Endpoint agregasi baru di `apps/api/src/routes/analytics.ts` — misal `GET /analytics/top-students?days=30&limit=10`: hitung jumlah jurnal berstatus `submitted/approved` per siswa dari tabel `journals` (join `students`), urutkan menurun. Tidak perlu perubahan skema.
2. [ ] Kartu "Siswa Terajin" di dashboard Kepala Sekolah (`apps/web/app/dashboard/kepala-sekolah/page.tsx`) dan Admin — tampilkan nama, kelas, jumlah pengisian.
3. [ ] Batasi per sekolah (pakai `schoolId` dari JWT, pola sama dengan `GET /analytics/summary`).
4. [ ] Opsional lanjutan: export guru (tombol Export Excel di daftar guru, pola sama `export-students-button.tsx`) dan statistik 7 Kebiasaan paling sering "selesai" dari `journal_items`.

## Opsional / catatan

- [ ] Keep-alive ping (Cloudflare cron tiap 4 menit → endpoint health yang menyentuh DB) jika cold start ±1 detik masih mengganggu. Konsekuensi: jatah compute-hours Free terpakai lebih cepat.
- [ ] Fase 10: perbarui `docs/tutorial-penggunaan.md` (fitur kelulusan/kenaikan & revisi 11 Juli belum terdokumentasi).
- [ ] Opsional landing: pakai `schools.logoUrl` agar logo tidak hardcode.
- Status proyek: Fase 1–8 selesai, sisa Fase 9–10 (±15–20%).
