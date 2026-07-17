-- =====================================================================
--  BERSIHKAN DATA CONTOH / SIMULASI
--  Aplikasi: Jurnal Karakter & Monitoring Peserta Didik
--
--  Skrip ini MENGHAPUS seluruh data contoh (sekolah, siswa, guru,
--  orang tua, jurnal, verifikasi, dst) TAPI mempertahankan:
--    - Tabel `roles` (6 peran sistem = data konfigurasi, bukan contoh)
--    - 1 akun admin agar kamu tetap bisa login
--
--  PERINGATAN: penghapusan ini PERMANEN dan tidak bisa di-undo.
--  Jalankan hanya jika kamu yakin data di database memang data simulasi.
--
--  Cara pakai (rekomendasi: Neon SQL Editor di browser):
--    1) Jalankan LANGKAH 0 dulu untuk melihat daftar akun & menemukan
--       email admin yang mau disimpan.
--    2) Ganti email di LANGKAH 2 (baris bertanda  <<< EDIT ) dengan
--       email admin tersebut.
--    3) Blok & jalankan LANGKAH 1 s/d 2 (di dalam satu transaksi).
--    4) Jalankan LANGKAH 3 untuk memverifikasi hasilnya.
-- =====================================================================


-- ---------------------------------------------------------------------
--  LANGKAH 0 — LIHAT SEMUA AKUN (untuk menemukan email admin)
--  Jalankan blok ini sendiri terlebih dulu. Catat email admin-nya.
-- ---------------------------------------------------------------------
SELECT u.email,
       r.name AS role,
       u.is_active,
       u.created_at
FROM users u
JOIN roles r ON r.id = u.role_id
ORDER BY r.name, u.created_at;


-- ---------------------------------------------------------------------
--  LANGKAH 1 & 2 — PEMBERSIHAN (jalankan sebagai SATU transaksi)
--
--  Urutan penghapusan sengaja dari tabel "anak" ke "induk" agar tidak
--  melanggar foreign key ber-constraint RESTRICT (teacher_student,
--  verifications, journals, journal_items, dsb).
--
--  Semua dibungkus BEGIN ... COMMIT: jika ada satu error, TIDAK ADA
--  yang tersimpan (aman untuk dicoba).
-- ---------------------------------------------------------------------
BEGIN;

-- LANGKAH 1 — Kosongkan tabel data contoh (dari anak ke induk).

-- Log & audit (menunjuk users; dihapus penuh, bukan data operasional).
DELETE FROM audit_logs;
DELETE FROM logs;
DELETE FROM notifications;

-- Komentar & verifikasi jurnal.
DELETE FROM comments;
DELETE FROM verifications;

-- Isi jurnal, lalu jurnal.
DELETE FROM journal_items;
DELETE FROM evidence_requirements;
DELETE FROM journals;

-- Template jurnal (per-sekolah = data contoh).
DELETE FROM journal_template_items;
DELETE FROM journal_templates;

-- Relasi guru-siswa & siswa-orang tua.
DELETE FROM teacher_student;
DELETE FROM student_parent;

-- Pengaturan per-sekolah, tahun ajaran & semester.
DELETE FROM settings;
DELETE FROM semesters;
DELETE FROM academic_years;

-- Profil (menunjuk users & schools).
DELETE FROM teachers;
DELETE FROM principals;
DELETE FROM students;
DELETE FROM parents;

-- Sekolah contoh.
DELETE FROM schools;


-- LANGKAH 2 — Hapus semua akun user KECUALI akun admin yang disimpan.
--
--  >>> GANTI email di bawah dengan email admin kamu (dari LANGKAH 0). <<<
--  Jika ingin menyimpan lebih dari satu akun, ubah menjadi:
--     WHERE email NOT IN ('admin@contoh.com', 'akun2@contoh.com')
DELETE FROM users
WHERE email <> 'admin@contoh.com';   -- <<< EDIT email admin di sini


COMMIT;


-- ---------------------------------------------------------------------
--  LANGKAH 3 — VERIFIKASI (jalankan setelah COMMIT)
--  Semua tabel data harus 0, kecuali `roles` (=6) dan `users` (=jumlah
--  akun yang kamu simpan, mis. 1).
-- ---------------------------------------------------------------------
SELECT 'roles'                  AS tabel, COUNT(*) AS jumlah FROM roles
UNION ALL SELECT 'users',                 COUNT(*) FROM users
UNION ALL SELECT 'schools',               COUNT(*) FROM schools
UNION ALL SELECT 'academic_years',        COUNT(*) FROM academic_years
UNION ALL SELECT 'semesters',             COUNT(*) FROM semesters
UNION ALL SELECT 'teachers',              COUNT(*) FROM teachers
UNION ALL SELECT 'principals',            COUNT(*) FROM principals
UNION ALL SELECT 'students',              COUNT(*) FROM students
UNION ALL SELECT 'parents',               COUNT(*) FROM parents
UNION ALL SELECT 'student_parent',        COUNT(*) FROM student_parent
UNION ALL SELECT 'teacher_student',       COUNT(*) FROM teacher_student
UNION ALL SELECT 'journal_templates',     COUNT(*) FROM journal_templates
UNION ALL SELECT 'journal_template_items',COUNT(*) FROM journal_template_items
UNION ALL SELECT 'journals',              COUNT(*) FROM journals
UNION ALL SELECT 'journal_items',         COUNT(*) FROM journal_items
UNION ALL SELECT 'evidence_requirements', COUNT(*) FROM evidence_requirements
UNION ALL SELECT 'verifications',         COUNT(*) FROM verifications
UNION ALL SELECT 'comments',              COUNT(*) FROM comments
UNION ALL SELECT 'notifications',         COUNT(*) FROM notifications
UNION ALL SELECT 'settings',              COUNT(*) FROM settings
UNION ALL SELECT 'logs',                  COUNT(*) FROM logs
UNION ALL SELECT 'audit_logs',            COUNT(*) FROM audit_logs
ORDER BY tabel;
