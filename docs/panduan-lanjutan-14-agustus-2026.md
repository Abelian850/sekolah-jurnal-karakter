# Panduan Lanjutan — 14 Agustus 2026

Catatan tindak lanjut setelah perbaikan nama HAXI / KHAILA di database produksi.
Semua yang ada di sini **belum dikerjakan** dan perlu Anda jalankan sendiri.

---

## 0. Yang SUDAH selesai (arsip)

Dieksekusi langsung di Neon SQL Editor, branch `production`, database `neondb`,
proyek `sekolah-jurnal-karakter` (AWS Singapore, `delicate-queen-81858224`):

```sql
BEGIN;
INSERT INTO audit_logs (...) SELECT ... FROM students s
  WHERE s.nisn IN ('3132934941','0133055645');   -- INSERT 2
UPDATE students SET full_name = ..., gender = ...
  WHERE nisn IN ('3132934941','0133055645');     -- UPDATE 2
COMMIT;
```

Hasil akhir:

| NISN | Nama (sesudah) | JK | Email login | Jurnal |
|---|---|---|---|---|
| 3132934941 | HAXI SATRIYA MUKTI | L | 3132934941@siswa.internal | 3 |
| 0133055645 | KHAILA CAHAYA ZAHRA | P | 0133055645@siswa.internal | 1 |

Yang **tidak** disentuh: `students.nisn`, `users.email`, `users.password_hash`.
Kedua murid tetap masuk memakai NISN dan kata sandi yang sama — tidak perlu
diberi tahu apa-apa. Riwayat jurnal ikut pindah ke pemilik yang benar karena
jurnal menempel pada baris murid, bukan pada nama.

Jejak perubahan tersimpan di `audit_logs` dengan `action = 'fix_nama_tertukar'`,
lengkap dengan nilai lamanya. Untuk membatalkan:

```sql
SELECT record_id, old_value, new_value, created_at
FROM audit_logs WHERE action = 'fix_nama_tertukar' ORDER BY created_at DESC;
```

---

## 1. PENTING — tiga spreadsheet sumber masih salah

Ini yang paling berisiko. Database sudah benar, tapi file sumbernya belum.
Kalau suatu saat ada impor ulang, kenaikan kelas, atau pembuatan akun dari file
ini, kesalahan yang sama masuk lagi dan menimpa perbaikan tadi.

File yang harus dikoreksi (tukar posisi kedua NAMA, biarkan NISN-nya):

| File | Yang tertulis sekarang | Seharusnya |
|---|---|---|
| `Impor Peserta Didik.xlsx` | 0133055645 = HAXI, 3132934941 = KHAILA | 0133055645 = KHAILA, 3132934941 = HAXI |
| `Daftar Peserta Didik 2026-2027.xlsx` | baris 15 & 16 | idem |
| `Impor Murid Binaan/7A - Nur Khasanah.xlsx` | baris 15 & 16 | idem |

Acuan kebenaran: pangkalan data NISN resmi — NISN 3132934941 atas nama
HAXI SATRIYA MUKTI, laki-laki, Wonosobo 9 Februari 2013, SMP Negeri 30 Semarang.

**Belum diverifikasi:** apakah 0133055645 benar milik KHAILA CAHAYA ZAHRA.
Silakan cek di https://ceknisnonline.com (menu "Berdasarkan NISN" — butuh nama
ibu kandung, atau pakai "Berdasarkan Nama" + tempat & tanggal lahir). Kalau
ternyata NISN itu milik orang lain, hubungi saya sebelum mengubah apa pun lagi.

---

## 2. Tiga temuan lain di file penugasan Guru Wali

Ditemukan saat memeriksa 760 baris di 37 file `Impor Murid Binaan/`.
Semuanya **belum diperbaiki**.

### 2a. Athaillah dobel, Maulidina hilang

`7H - Eny Agustyaningsih.xlsx` baris 7 memuat NISN `0136168183` dengan label
nama "MAULIDINA CITRA KIRANA". NISN itu sebenarnya milik **ATHAILLAH PONDA
PUTRA HARTOMO**. Karena impor penugasan bekerja berdasarkan NISN (kolom nama
hanya label), yang benar-benar ditugaskan ke Bu Eny adalah Athaillah — dan
Athaillah juga sudah terdaftar di `7G-7H - Sri Utami.xlsx`, jadi dobel.

Perbaikan: ganti NISN di baris itu menjadi `0141017578` (NISN Maulidina).
Lalu impor ulang file 7H, dan cek Athaillah tidak punya dua wali aktif:

```sql
SELECT s.full_name, t.full_name AS wali, ts.assigned_at, ts.unassigned_at
FROM teacher_student ts
JOIN students s ON s.id = ts.student_id
JOIN teachers t ON t.id = ts.teacher_id
WHERE s.nisn = '0136168183';
```

### 2b. NISN Daniswara kehilangan angka 0 di depan

`7F - Niken Dwi Cahyanti.xlsx` baris 4 tertulis `149868772` (9 digit).
Seharusnya `0149868772`. Baris ini pasti gagal saat impor, jadi
**DANISWARA NAGARI BHAGAWANTA saat ini kemungkinan tidak punya Guru Wali.**

Penyebabnya Excel membuang angka nol di depan. Saat memperbaiki, format
kolom NISN sebagai **Teks** dulu, jangan Angka.

### 2c. Nayla Anya Aurelia tidak ada di master

`9B - Hartini.xlsx` baris 19: NISN `01127744716` (11 digit — NISN normal 10
digit) dan namanya tidak ada sama sekali di `Impor Peserta Didik.xlsx`.
Kemungkinan ini kasus yang tercatat di `Menunggu NISN.xlsx`. Perlu NISN asli
dari Dapodik dulu sebelum akunnya bisa dibuat.

Cek murid mana saja yang belum punya wali aktif:

```sql
SELECT s.nisn, s.full_name, s.class_name
FROM students s
WHERE s.is_active
  AND NOT EXISTS (
    SELECT 1 FROM teacher_student ts
    WHERE ts.student_id = s.id AND ts.unassigned_at IS NULL
  )
ORDER BY s.class_name, s.full_name;
```

---

## 3. Perubahan kode yang masih menunggu di repo

### 3a. Skala nilai rapor 70–100 (belum di-deploy)

14 file berubah, belum di-commit. Ringkasnya: `computeCharacterScore` tetap
menghasilkan persentase mentah, `toReportScore()` baru memetakannya ke 70–100
di lapisan tampilan. Dashboard Admin & Kepala Sekolah sengaja tetap mentah dan
labelnya sudah diganti jadi "Capaian Kebiasaan".

Sebelum deploy:

```
npm run typecheck
npm run dev:web        # cek halaman murid, orang tua, guru wali
```

Saya **tidak bisa menjalankan `npm run typecheck` sampai tuntas** — symlink
`node_modules/@sjk/*` tidak terbaca lewat mount OneDrive (I/O error). ESLint
lolos untuk semua 14 file dan typecheck `packages/shared` lolos, tapi typecheck
`apps/web` harus Anda jalankan sendiri di mesin lokal.

### 3b. Skrip `fix-swapped-student-names.ts`

Sudah ada di `apps/api/src/db/`, terdaftar sebagai `npm run db:fix-nama-tertukar`.
Kasus Haxi/Khaila sudah terlanjur saya kerjakan langsung lewat SQL Editor, jadi
skrip ini sekarang akan melaporkan "Tidak ada yang perlu diubah" (idempoten).

**Simpan saja.** Kalau nanti ada kasus nama tertukar lagi, cukup tambahkan
pasangannya di konstanta `PASANGAN_BENAR` lalu jalankan dry-run dulu:

```
npm run db:fix-nama-tertukar              # dry run
npm run db:fix-nama-tertukar -- --apply   # menulis
```

### 3c. Hapus folder `_to_delete/`

Ada di root repo. Isinya file `.git/index.lock` basi yang saya pindahkan ke
sana karena mount OneDrive tidak mengizinkan penghapusan file. Kalau dibiarkan,
`git commit` Anda berikutnya bisa tertahan.

---

## 4. Akar masalahnya: aplikasi tidak punya fitur edit murid

Ini alasan sebenarnya kenapa perbaikan tadi harus lewat SQL langsung.
`apps/api/src/routes/students.ts` hanya punya: create, impor massal, reset kata
sandi, hapus, dan penugasan wali. **Tidak ada endpoint untuk mengubah nama,
NISN, jenis kelamin, atau kelas seorang murid.**

Selama fitur itu belum ada, setiap salah ketik nama murid berarti membuka SQL
Editor produksi — dan itu jauh lebih berbahaya daripada kesalahan yang sedang
diperbaiki. Saran saya jadikan ini pekerjaan berikutnya:

- `PATCH /students/:id` dengan izin `STUDENT_MANAGE`, menerima `fullName`,
  `gender`, `className`, `birthDate`, `nis`.
- **Kecualikan `nisn` dari endpoint itu.** NISN adalah identitas login —
  mengubahnya harus ikut mengubah `users.email` dan `users.password_hash`,
  jadi buat alur terpisah yang sadar konsekuensi, bukan satu form biasa.
- Tulis ke `audit_logs` seperti rute lain.
- Halaman `/dashboard/admin/siswa` sudah punya kolom Aksi — tinggal tambah
  tombol Edit di sana.
