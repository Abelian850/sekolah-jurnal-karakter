# Rencana Kerja — Sabtu, 18 Juli 2026

## Konteks (hasil sesi 17 Juli)

- Data contoh dihapus permanen dari database. Tersisa: `roles` (6) + 1 akun admin `admin30@sekolah.com`.
- Database dimigrasi ke project Neon baru region **Singapore (ap-southeast-1)**, project `delicate-queen-81858224` — mengatasi delay login akibat latensi ke us-east-1.
- 22 tabel (8 migrasi Drizzle) + tracking `__drizzle_migrations` sudah terpasang di DB baru.
- `DATABASE_URL` lokal (`apps/api/.dev.vars` & `apps/web/.env.local`) sudah menunjuk DB baru.
- Project Neon lama (us-east-1) **masih ada** — jangan dihapus sebelum produksi terbukti jalan.

## Prioritas 1 — Finalisasi migrasi (±15 menit)

1. [ ] Update secret `DATABASE_URL` di GitHub: repo → Settings → Secrets and variables → Actions. Nilai baru ada di `apps/api/.dev.vars`. (Satu secret ini dipakai deploy-api & deploy-web, otomatis diteruskan ke Cloudflare.)
2. [ ] Push / re-run workflow deploy, pastikan `db:migrate` di CI lolos (harusnya "no migrations to run").
3. [ ] Uji login produksi dengan `admin30@sekolah.com` — bandingkan kecepatannya.
4. [ ] Uji login lokal (`npm run dev:web` + `dev:api`).
5. [ ] Setelah semua terbukti jalan: hapus project Neon lama (us-east-1) agar tidak membingungkan.

## Prioritas 2 — Mulai Fase 9 (hardening)

Urutan yang disarankan:

1. [ ] **Ganti kata sandi mandiri** — paling mendesak: sandi awal guru = NIP dan siswa = NISN, keduanya bukan rahasia. Halaman profil + endpoint `PATCH /me/password` (verifikasi sandi lama, hash PBKDF2 baru).
2. [ ] **Kelengkapan audit log** — baru terpasang di modul kelulusan/kenaikan; tambahkan ke login (isi `last_login_at`), CRUD user, verifikasi jurnal, dan perubahan settings.
3. [ ] **Backup/restore** — minimal dokumentasikan prosedur export via Neon (atau branch snapshot); Free plan punya point-in-time restore terbatas.
4. [ ] **Hardening** — rate limiting login (Workers), validasi ukuran/jenis file upload foto bukti, review CORS `FRONTEND_ORIGIN`.

## Opsional / catatan

- [ ] Keep-alive ping (Cloudflare cron tiap 4 menit → endpoint health yang menyentuh DB) jika cold start ±1 detik masih mengganggu. Konsekuensi: jatah compute-hours Free terpakai lebih cepat.
- [ ] Fase 10: perbarui `docs/tutorial-penggunaan.md` (fitur kelulusan/kenaikan & revisi 11 Juli belum terdokumentasi).
- [ ] Opsional landing: pakai `schools.logoUrl` agar logo tidak hardcode.
- Status proyek: Fase 1–8 selesai, sisa Fase 9–10 (±15–20%).
