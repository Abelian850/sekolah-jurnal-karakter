# Migrasi & Backup Database

## Alur migrasi (Drizzle Kit)

1. Ubah skema di `apps/api/src/db/schema.ts`.
2. Generate file migrasi SQL:
   ```bash
   npm run db:generate
   ```
   Ini menghasilkan file baru di folder `drizzle/` (WAJIB di-commit ke git — ini adalah riwayat perubahan skema, bukan artefak build).
3. Jalankan migrasi ke database:
   ```bash
   DATABASE_URL="<connection-string>" npm run db:migrate
   ```
4. Saat push ke `main`, `deploy-api.yml` menjalankan migrasi yang sama secara otomatis ke database production **sebelum** kode baru di-deploy.

## Backup

Neon free tier tidak menyediakan backup terjadwal otomatis. Mitigasi:

1. **Backup manual via `pg_dump`** (jalankan berkala, misal mingguan):
   ```bash
   pg_dump "$DATABASE_URL" -F c -f backup-$(date +%Y%m%d).dump
   ```
2. **Otomatisasi via GitHub Actions terjadwal** (opsional, direkomendasikan untuk produksi): buat workflow dengan `on: schedule` yang menjalankan `pg_dump` lalu mengunggah hasilnya ke Cloudflare R2 (bucket terpisah, mis. `sjk-backups`). Karena R2 tidak mengenakan biaya egress, ini tetap gratis untuk skala satu sekolah.
3. Simpan minimal 4 backup mingguan terakhir (rotasi otomatis) agar tidak melebihi kuota storage R2.

## Restore

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists backup-20260701.dump
```

Selalu uji proses restore di database Neon **branch** terpisah (fitur branching Neon) sebelum melakukan restore ke database production, agar tidak ada risiko kehilangan data saat proses restore gagal di tengah jalan.
