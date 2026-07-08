# Tutorial Penggunaan (per Fase)

Dokumen ini berbeda dari `docs/setup-lokal.md` (yang isinya untuk developer
men-jalankan proyek). Dokumen ini isinya **cara memakai fitur** yang sudah
selesai di setiap fase, ditulis untuk Admin/Guru/dsb yang memakai aplikasinya
sehari-hari. Diperbarui setiap fase baru selesai — jangan dihapus bagian fase
sebelumnya, supaya jadi manual lengkap saat proyek selesai (dipakai ulang di
Fase 10 sebagai bagian dari dokumentasi akhir).

---

## Fase 1 — Tidak ada yang dijalankan

Fase 1 hanya menghasilkan dokumen analisis dan 4 diagram (`.mermaid`). Tidak
ada aplikasi yang bisa dicoba. Cara "memakainya": buka
`fase-1-analisis-dan-arsitektur.md` untuk memahami keputusan desain, dan buka
file `.mermaid` langsung di GitHub (otomatis jadi diagram visual) untuk
melihat ERD/use case/flowchart/arsitektur.

---

## Fase 2 — Memverifikasi infrastruktur dasar menyala

> ⚠️ **Update:** setelah Fase 4, `apps/web` bermigrasi dari
> `@cloudflare/next-on-pages` (deprecated) ke `@opennextjs/cloudflare`, dan
> Next.js dinaikkan ke versi 16.2.10 LTS (menambal CVE-2025-66478). Langkah
> di bawah ini tetap sama persis untuk `npm run dev:web` / `npm run dev:api`
> — perubahan hanya terasa saat deploy ke Cloudflare (lihat
> `docs/deployment.md`).

Belum ada fitur bisnis. Tujuan Fase 2 hanya membuktikan Next.js, Hono, dan
Neon bisa saling terhubung.

1. Ikuti `docs/setup-lokal.md` langkah 1-3 (install, buat database Neon, isi `.env`/`.dev.vars`).
2. Jalankan backend: `npm run dev:api`, lalu buka `http://localhost:8787/health` di browser.
   Anda akan melihat:
   ```json
   { "status": "ok", "database": "connected", "timestamp": "..." }
   ```
   Jika `database: "disconnected"` muncul, cek kembali `DATABASE_URL` di `apps/api/.dev.vars`.
3. Jalankan frontend: `npm run dev:web`, buka `http://localhost:3000`.
   Anda akan melihat landing page sederhana dengan tombol "Masuk ke Sistem".
4. Klik tombol tersebut → halaman login muncul. **Login belum akan berhasil**
   di titik ini karena belum ada akun apa pun di database — itu wajar, akun
   pertama baru dibuat di Fase 3.

---

## Fase 3 — Login dan Dashboard Admin (Sekolah, Tahun Pelajaran, Semester)

### Membuat akun Admin pertama

Belum ada UI pendaftaran (memang disengaja — hanya Admin yang boleh membuat
akun apa pun di sistem ini). Ikuti `docs/setup-lokal.md` bagian "Membuat akun
admin pertama" untuk membuat baris `roles` dan satu akun admin lewat Drizzle
Studio.

### Login

1. Buka `http://localhost:3000/login`.
2. Isi email & kata sandi akun admin yang baru dibuat.
3. Setelah berhasil, Anda otomatis diarahkan ke `/dashboard/admin`.

### Menambah Sekolah

1. Di sidebar, klik **Sekolah** → **+ Tambah Sekolah**.
2. Isi Nama Sekolah (wajib), NPSN dan Alamat (opsional).
3. Klik **Simpan** → Anda kembali ke daftar sekolah dan melihat baris baru.

### Menambah & Mengaktifkan Tahun Pelajaran

1. Klik **Tahun Pelajaran** → **+ Tambah Tahun Pelajaran**.
2. Pilih Sekolah, isi Tahun (format `2026/2027`), klik **Simpan**.
3. Di daftar, klik **Aktifkan** pada tahun yang ingin dipakai sebagai tahun
   berjalan. Tahun ajaran lain di sekolah yang sama otomatis dinonaktifkan
   (hanya boleh satu yang aktif).

### Menambah & Mengaktifkan Semester

1. Klik **Semester** → **+ Tambah Semester**.
2. Pilih Tahun Pelajaran, pilih Ganjil/Genap, isi tanggal mulai & selesai.
3. Klik **Aktifkan** pada semester yang sedang berjalan (aturan "hanya satu
   aktif" berlaku sama seperti Tahun Pelajaran, tapi dalam lingkup satu
   tahun ajaran).

---

## Fase 4 — Kelola Guru, Guru Wali, Peserta Didik, Orang Tua, Bulk Excel

> Prasyarat: sudah ada minimal satu Sekolah, Tahun Pelajaran, dan Semester
> dari Fase 3.

### Menambah Guru (dan menjadikannya Guru Wali)

1. Sidebar → **Guru** → **+ Tambah Guru**.
2. Isi Sekolah, Nama, Email, Kata Sandi Awal (ini yang dipakai guru untuk
   login pertama kali — sampaikan ke guru yang bersangkutan).
3. Centang **"Jadikan Guru Wali sejak awal"** jika guru ini langsung
   bertugas sebagai Guru Wali. Jika belum yakin, biarkan tidak dicentang —
   bisa diaktifkan belakangan lewat tombol **"Jadikan Guru Wali"** di daftar Guru.

### Menambah Peserta Didik satu per satu

1. Sidebar → **Peserta Didik** → **+ Tambah Siswa**.
2. Isi semua field. **Kelas** diisi bebas seperti `VII A` (ini atribut siswa
   biasa, bukan pilihan dari daftar Guru Wali — sesuai konsep Guru Wali yang
   independen dari kelas).

### Impor Peserta Didik lewat Excel (untuk banyak siswa sekaligus)

1. Unduh contoh template di [`docs/templates/template-import-siswa.xlsx`](./templates/template-import-siswa.xlsx)
   — sudah berisi header kolom yang benar + 2 baris contoh.
2. Isi/ganti baris-baris di template sesuai data siswa sekolah Anda. Jangan
   mengubah nama kolom di baris pertama.
   - Kolom wajib: `email, password, nis, fullName, className, gradeLevel`
   - Kolom opsional (boleh dikosongkan): `nisn, gender (isi L/P), birthDate (format YYYY-MM-DD)`
3. Sidebar → **Peserta Didik** → **Impor Excel**.
4. Pilih Sekolah tujuan di dropdown atas.
5. Klik **File Excel (.xlsx)**, pilih file yang sudah diisi.
6. Preview 20 baris pertama akan muncul untuk Anda cek sekilas.
7. Klik **Impor N Peserta Didik**. Tunggu sampai muncul ringkasan
   "X berhasil, Y gagal". Jika ada yang gagal (mis. email sudah dipakai),
   pesan errornya ditampilkan per baris — perbaiki lalu impor ulang khusus
   baris yang gagal saja (baris yang sudah berhasil tidak akan terduplikasi
   selama email/NIS-nya tidak diulang).

### Export Peserta Didik ke Excel

1. Di halaman **Peserta Didik**, klik **Export Excel**.
2. File `peserta-didik-<tanggal>.xlsx` otomatis terunduh berisi seluruh data
   yang sedang tampil di tabel.

### Menambah Orang Tua

1. Sidebar → **Orang Tua** → **+ Tambah Orang Tua**.
2. Isi data, lalu di kolom **Peserta Didik Terkait**, pilih satu siswa atau
   lebih (tahan Ctrl/Cmd untuk multi-pilih) — berguna untuk orang tua dengan
   anak lebih dari satu di sekolah yang sama.

### Menugaskan / Memindahkan Guru Wali

Ini fitur inti aplikasi. Sidebar → **Penugasan Guru Wali**:

1. Pilih **Peserta Didik** dan **Tahun Pelajaran** yang relevan.
2. Klik **Cek Guru Wali Saat Ini** — sistem menampilkan siapa Guru Wali
   siswa tersebut sekarang (atau "Belum ada" jika belum pernah ditugaskan).
3. Di dropdown bawah, pilih Guru Wali yang diinginkan (hanya guru berstatus
   Guru Wali yang muncul di sini).
4. Klik **Simpan Penugasan**.
   - Jika siswa **belum** punya Guru Wali → langsung tertugaskan.
   - Jika siswa **sudah** punya Guru Wali lain → otomatis "dipindahkan":
     penugasan lama ditutup (tercatat kapan berakhirnya), penugasan baru
     dibuat. **Data siswa sendiri sama sekali tidak berubah** — hanya relasi
     penugasannya.
5. Ulangi untuk siswa lain. Satu Guru Wali bisa dipilih berkali-kali untuk
   siswa yang berbeda-beda, termasuk siswa dari kelas dan angkatan yang
   berbeda (VII, VIII, IX sekaligus) — sesuai konsep Guru Wali di proyek ini.

---

## Fase 5 — Modul Jurnal Harian

> Prasyarat: Tahun Pelajaran **aktif**, Semester **aktif** (Fase 3), dan
> minimal satu akun Peserta Didik (Fase 4). Tanpa ketiganya, siswa akan
> melihat pesan "Hubungi Admin sekolah" saat mencoba membuat jurnal.

### Admin — Membuat Template Jurnal

Template menentukan item apa saja yang diisi siswa setiap hari.

1. Login sebagai **Admin** → Sidebar → **Template Jurnal** → **+ Buat Template**.
2. Pilih Sekolah, beri nama (contoh: `Jurnal Karakter Harian 2026/2027`).
3. Tambahkan item satu per satu. Setiap item punya **tipe**:
   - **Checklist** — siswa memilih selesai / belum / sebagian (contoh: *Sholat Subuh*).
   - **Waktu** — siswa mencatat jam pelaksanaan (contoh: *Jam bangun pagi*).
   - **Catatan** — teks bebas (contoh: *Kegiatan membantu orang tua*).
   - **Foto** — tautan URL bukti foto.
4. Simpan. Pastikan template berstatus **Aktif** — hanya satu template aktif
   per sekolah yang dipakai saat siswa membuat jurnal baru.
5. Template bisa diubah (nama, item, status aktif) dari daftar Template
   Jurnal selama diperlukan. Item template yang sudah terpakai di jurnal
   siswa tidak bisa dihapus (dilindungi sistem).

### Peserta Didik — Mengisi Jurnal Harian

1. Login sebagai **Peserta Didik** → menu **Jurnal Hari Ini**.
2. Klik **Buat Jurnal Hari Ini** — sistem menyalin semua item dari template
   aktif. Satu siswa hanya bisa punya **satu jurnal per tanggal**.
3. Isi setiap item sesuai tipenya (checklist / jam / catatan / URL foto).
   Setiap perubahan tersimpan per item, jadi aman mengisi bertahap sepanjang hari.
4. Setelah semua terisi, klik **Kirim Jurnal**. Status berubah menjadi
   **Terkirim** dan jurnal **tidak bisa diubah lagi** — menunggu verifikasi
   Guru Wali (Fase 6).

### Peserta Didik — Melihat Riwayat

Menu **Riwayat Jurnal** menampilkan semua jurnal terurut dari terbaru,
dengan badge status: Draf / Terkirim / Disetujui / Ditolak. Klik salah satu
untuk melihat detail isiannya.

---

## Fase 6 — Validasi & Penilaian Karakter + Notifikasi

> Prasyarat: jalankan migrasi database terbaru dulu (`npm run db:migrate`,
> perlu `DATABASE_URL`) karena Fase 6 menambah nilai enum baru (`revisi`)
> pada tipe notifikasi. Selain itu perlu: Guru Wali yang sudah ditugaskan ke
> siswa (Fase 4), dan siswa yang sudah mengirim jurnal (Fase 5).

### Guru Wali — Memverifikasi Jurnal

1. Login sebagai **Guru Wali** → tab **Menunggu Verifikasi** menampilkan
   semua jurnal siswa binaan yang sudah dikirim, terlama dulu.
2. Klik **Periksa** pada salah satu jurnal untuk melihat seluruh isiannya.
3. Pilih salah satu keputusan:
   - **Setujui** — jurnal benar dan lengkap. **Nilai Karakter (1-100) wajib
     diisi**; catatan apresiasi opsional. Keputusan ini final.
   - **Minta Revisi** — ada yang perlu diperbaiki. **Catatan wajib diisi**
     (jelaskan apa yang salah). Jurnal kembali menjadi draf di sisi siswa
     agar bisa diperbaiki dan dikirim ulang, lalu muncul lagi di daftar
     Menunggu Verifikasi.
   - **Tolak** — jurnal tidak dapat diterima. **Catatan wajib diisi**.
     Keputusan ini final; siswa tidak bisa mengubahnya lagi.
4. Tab **Riwayat Verifikasi** menampilkan 100 keputusan terakhir Anda
   beserta nilai yang diberikan.

Keamanan: Guru Wali hanya bisa melihat dan memverifikasi jurnal milik siswa
binaan **aktif**-nya — dicek ulang di server lewat relasi penugasan, bukan
dari data yang dikirim browser.

### Peserta Didik — Menerima Hasil & Merevisi

- Hasil verifikasi tampil di **Jurnal Hari Ini** dan detail **Riwayat
  Jurnal**: nilai karakter + catatan (jika disetujui), alasan (jika ditolak).
- Jika Guru Wali meminta **revisi**, jurnal otomatis kembali menjadi draf
  dengan kotak peringatan berisi catatan guru. Perbaiki isian yang diminta,
  lalu klik **Kirim Jurnal** lagi.

### Notifikasi

Setiap keputusan Guru Wali otomatis membuat notifikasi untuk **siswa** dan
**semua orang tua yang tertaut** ke siswa itu (orang tua akan melihatnya di
dashboard mereka pada Fase 7).

- Siswa: menu **Notifikasi** (ada badge merah jumlah belum dibaca di menu).
- Klik **Tandai semua terbaca** untuk membersihkan badge.
