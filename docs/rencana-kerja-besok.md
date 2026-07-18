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
2. [x] **Kelengkapan audit log** — SELESAI 18 Juli. Hasil survey: CRUD user/settings/verifikasi TERNYATA sudah lengkap semua (teachers, students, parents, principals, schools, semesters, academic-years, teacher-student, verifications, journal-templates, evidence-requirements). Yang ditambahkan: login sukses → isi `last_login_at` + baris audit `action: "login"` dengan IP (di `authorize` Auth.js, dibungkus try/catch agar gagal-log tidak menggagalkan login). Sengaja TIDAK di-audit agar log tidak banjir: pengisian jurnal harian siswa, komentar ortu, upload foto, tandai-baca notifikasi.
3. [ ] **Backup/restore** — minimal dokumentasikan prosedur export via Neon (atau branch snapshot); Free plan punya point-in-time restore terbatas.
4. [x] **Hardening** — SELESAI 18 Juli (sesi 2). Rate limiting login berbasis `audit_logs` action `login_failed` (5 gagal/15 mnt per akun, 20/15 mnt per IP; cek SEBELUM verifikasi argon2; fail-open saat DB bermasalah agar tidak mengunci semua orang). Validasi upload TERNYATA sudah ada sejak fitur R2 (MIME jpg/png/webp + maks 5MB di `files.ts`) — tidak perlu perubahan. CORS: ditambah fail-closed bila `FRONTEND_ORIGIN` kosong (sebelumnya default hono/cors = `*`).

## Prioritas 3 — Fitur baru: siswa paling rajin mengisi jurnal

1. [x] SELESAI 18 Juli (sesi 2). `GET /analytics/top-students` (KS, schoolId dari JWT) + `GET /analytics/admin-top-students` (Admin, opsional `?schoolId=`) — hitung jurnal `submitted/approved` per siswa aktif, param `date`/`days`/`limit`, tanpa perubahan skema.
2. [x] Kartu "Siswa Terajin" (`components/top-students-card.tsx`) tampil di dashboard KS & Admin — peringkat, nama, kelas, jumlah jurnal.
3. [x] Pembatasan per sekolah mengikuti pola `/summary` & `/admin-summary`.
4. [ ] Opsional lanjutan: export guru (tombol Export Excel di daftar guru, pola sama `export-students-button.tsx`) dan statistik 7 Kebiasaan paling sering "selesai" dari `journal_items`.

## Opsional / catatan

- [ ] Keep-alive ping (Cloudflare cron tiap 4 menit → endpoint health yang menyentuh DB) jika cold start ±1 detik masih mengganggu. Konsekuensi: jatah compute-hours Free terpakai lebih cepat.
- [ ] Fase 10: perbarui `docs/tutorial-penggunaan.md` (fitur kelulusan/kenaikan & revisi 11 Juli belum terdokumentasi).
- [ ] Opsional landing: pakai `schools.logoUrl` agar logo tidak hardcode.
- Status proyek: Fase 1–8 selesai, sisa Fase 9–10 (±15–20%).
