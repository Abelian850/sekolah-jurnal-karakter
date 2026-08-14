# Fitur Edit Murid (Admin)

Ditambahkan 14 Agustus 2026. Menutup celah yang membuat koreksi data murid
harus dilakukan lewat SQL Editor produksi.

---

## Latar belakang

Sebelum ini `apps/api/src/routes/students.ts` hanya punya: buat, impor massal,
reset kata sandi, hapus, dan penugasan wali. **Tidak ada cara mengubah data
murid yang sudah terdaftar.** Akibatnya, salah ketik satu nama murid berarti
membuka SQL Editor produksi — pekerjaan yang jauh lebih berbahaya daripada
kesalahan yang sedang diperbaiki.

Pemicunya kejadian nyata: nama HAXI SATRIYA MUKTI dan KHAILA CAHAYA ZAHRA
tertukar antar dua NISN sejak impor awal, dan satu-satunya jalan keluar adalah
`UPDATE students` manual di Neon.

---

## Cara pakai

1. Masuk sebagai Admin, buka **Murid** (`/dashboard/admin/siswa`).
2. Pada baris murid yang mau dikoreksi, klik **Edit** di kolom Aksi.
3. Ubah yang perlu, klik **Simpan Perubahan**. Kembali otomatis ke daftar.

Alumni dan murid nonaktif juga bisa diedit — centang "Tampilkan
alumni/nonaktif" dulu di daftar. Statusnya ditampilkan di judul halaman edit
supaya tidak salah orang.

Tombol **Reset sandi ke NISN** juga tersedia di halaman edit, di bawah garis
pemisah — sengaja di luar formulir, supaya mengkliknya tidak ikut menyimpan
perubahan yang belum selesai diketik.

---

## Yang bisa diubah

| Field | Catatan |
|---|---|
| Nama Lengkap | Minimal 3 karakter |
| NIS | Opsional. Dikosongkan = disimpan NULL. Unik per sekolah — bentrok ditolak dengan pesan siapa pemakainya |
| Kelas | Lihat catatan angkatan di bawah |
| Jenis Kelamin | Boleh dikosongkan |
| Tanggal Lahir | Boleh dikosongkan |

**Angkatan (`gradeLevel`) ikut berubah otomatis.** Kalau Kelas diubah dari
"VII A" menjadi "VIII A", angkatan otomatis jadi "VIII" — diturunkan dari kata
pertama, persis seperti saat murid dibuat. Ini disengaja: tanpa itu, angkatan
akan tertinggal di nilai lama dan fitur **Kelulusan & Kenaikan Kelas** — yang
menyaring murid berdasarkan angkatan — akan diam-diam memilih murid yang salah.

---

## Yang SENGAJA tidak bisa diubah

### NISN

Ini keputusan desain, bukan fitur yang belum sempat dibuat.

NISN bukan sekadar atribut murid — ia **identitas login**. `users.email`
diturunkan darinya (`nisnToEmail` → `<nisn>@siswa.internal`) dan kata sandi
awal juga NISN. Mengubah `students.nisn` saja akan membuat murid tidak bisa
masuk, karena email akunnya tidak ikut berubah.

Skema API memakai `.strict()`, jadi kalau ada `nisn` di payload PATCH,
jawabannya **400** — bukan diabaikan diam-diam. Kesalahan seperti ini lebih
baik berisik daripada senyap.

Kalau NISN seorang murid memang salah:

- **Belum punya jurnal** → hapus murid itu, daftarkan ulang dengan NISN benar.
- **Sudah punya jurnal** → jangan disentuh lewat aplikasi. Riwayat jurnal
  menempel pada baris murid, jadi menukar NISN akan memindahkan jurnal ke
  pemilik yang salah. Pakai `npm run db:fix-nama-tertukar` (lihat
  `apps/api/src/db/fix-swapped-student-names.ts`) yang justru menukar NAMA-nya,
  atau perbaiki langsung di database dengan sadar akibatnya.

### Status aktif / alumni

Punya alurnya sendiri di **Kelulusan & Kenaikan Kelas**. Mengubahnya dari form
edit biasa akan melewati pencatatan audit massal yang dilakukan alur itu.

### Sekolah (`schoolId`)

Pindah sekolah bukan operasi edit — murid pindah keluar dari pendataan sekolah
ini sepenuhnya.

---

## Yang berubah di kode

| File | Perubahan |
|---|---|
| `apps/api/src/routes/students.ts` | Baru: `GET /students/:id`, `PATCH /students/:id`, `UUID_REGEX`, `updateStudentSchema` |
| `apps/web/app/dashboard/admin/siswa/[id]/edit/page.tsx` | **File baru** — halaman + server action |
| `apps/web/app/dashboard/admin/siswa/page.tsx` | Tautan Edit di kolom Aksi |
| `apps/web/components/reset-student-password-button.tsx` | `type="button"` |

Catatan soal `type="button"`: tombol itu sebelumnya tanpa atribut `type`,
artinya default `submit`. Selama hanya dipakai di daftar murid (di luar form)
tidak ada efeknya, tapi begitu dipakai di dalam `<form>` halaman edit, satu klik
akan ikut men-submit formulir. Diperbaiki di komponennya, bukan ditambal di
pemakainya.

Detail lain:

- Semua perubahan tercatat di `audit_logs` (`action = 'update'`,
  `table_name = 'students'`) lengkap dengan `old_value` dan `new_value`.
- `:id` yang bukan UUID dijawab **404**, bukan 500 dari Postgres.
- Field yang tidak dikirim tidak disentuh; string kosong berarti "kosongkan"
  menjadi NULL. Bedanya nyata, dan formulir web selalu mengirim semua field.
- Server action memanggil `revalidatePath("/dashboard/admin/siswa")` sebelum
  redirect, supaya daftar tidak menampilkan baris lama sesaat.

---

## Sebelum deploy

Jalankan di mesin lokal Anda:

```
npm run typecheck
npm run lint
npm run dev:api      # terminal 1
npm run dev:web      # terminal 2
```

**Yang sudah saya verifikasi di sini:**

- ESLint bersih untuk keempat file.
- Typecheck `apps/api` **0 error** (memakai tsconfig sementara ber-path-mapping
  ke `packages/shared`, karena symlink `node_modules/@sjk/*` tidak terbaca lewat
  mount OneDrive).
- Typecheck file-file web yang berubah: **0 error**.

**Yang belum bisa saya verifikasi:** `npm run typecheck` penuh untuk `apps/web`
(butuh lebih lama dari batas waktu yang saya punya) dan tentu saja uji klik di
browser.

### Daftar periksa manual

1. Buka daftar murid → tombol **Edit** muncul di setiap baris.
2. Edit satu murid, ubah namanya → simpan → nama di daftar langsung berubah.
3. Buka lagi halaman edit → kolom **NISN** abu-abu dan tidak bisa diketik.
4. Ubah Kelas dari `VII A` ke `VIII A` → simpan → kolom **Angkatan** di daftar
   ikut menjadi `VIII`.
5. Isi NIS dengan nilai yang sudah dipakai murid lain → muncul pesan 409 berisi
   nama pemakainya, data tidak tersimpan.
6. Kosongkan Jenis Kelamin dan Tanggal Lahir → simpan → tersimpan kosong, tidak
   error.
7. Buka `/dashboard/admin/siswa/bukan-uuid/edit` → halaman 404, bukan error 500.
8. Login sebagai Guru Wali, coba buka URL edit → ditolak (izin
   `STUDENT_MANAGE` hanya milik Admin).
9. Cek jejaknya:

```sql
SELECT created_at, record_id, old_value->>'fullName' AS nama_lama,
       new_value->>'fullName' AS nama_baru
FROM audit_logs
WHERE table_name = 'students' AND action = 'update'
ORDER BY created_at DESC LIMIT 10;
```

---

## Sisa pekerjaan yang belum disentuh

Lihat `docs/panduan-lanjutan-14-agustus-2026.md`:

1. Tiga spreadsheet sumber masih memasang nama HAXI/KHAILA pada NISN yang salah.
2. Athaillah dobel wali; Daniswara dan Maulidina kemungkinan tanpa wali.
3. Perubahan skala nilai rapor 70–100 masih menunggu typecheck penuh + deploy.
4. Folder `_to_delete/` di root repo perlu Anda hapus manual.
