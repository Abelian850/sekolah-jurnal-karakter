# Folder Migrasi Drizzle

Folder ini **kosong secara sengaja** di repositori awal. Isinya di-generate secara
otomatis oleh Drizzle Kit berdasarkan `apps/api/src/db/schema.ts`, dan **wajib
di-commit** setelah digenerate (file migrasi adalah riwayat perubahan skema,
bukan artefak build sementara).

Jalankan setelah `npm install` dan `DATABASE_URL` sudah di-set:

```bash
npm run db:generate
```

Ini akan membuat file seperti `0000_initial.sql` beserta folder `meta/` di
sini. Setelah itu, jalankan `npm run db:migrate` untuk menerapkannya ke
database Neon Anda. Lihat `docs/database-migration.md` untuk alur lengkap.
