# Arsitektur Autentikasi

## Kenapa ada dua jenis token?

| | Token Sesi Next.js | Token API |
|---|---|---|
| Dibuat oleh | Auth.js (`apps/web/lib/auth.ts`) | `apps/web/lib/api-token.ts` |
| Format | JWE (terenkripsi, default Auth.js v5) | JWT ditandatangani HS256 (`jose.SignJWT`) |
| Disimpan di | Cookie HttpOnly browser | Tidak disimpan — dibuat ulang setiap kali memanggil API |
| Masa berlaku | Sesuai konfigurasi sesi Auth.js (default 30 hari, rolling) | 5 menit |
| Diverifikasi oleh | Auth.js sendiri (`auth()`) | Middleware Hono (`apps/api/src/middleware/auth.ts`) via `jose.jwtVerify` |
| Dipakai untuk | Melindungi halaman Next.js (`middleware.ts`, `requireRole()`) | Bearer token saat Next.js (server-side) memanggil backend Hono |

**Kenapa tidak memakai satu token saja?** Auth.js v5 dengan `session: { strategy: "jwt" }`
secara default meng-**enkripsi** token sesi (format JWE), bukan sekadar
menandatanganinya. Ini bagus untuk keamanan cookie browser, tapi tidak bisa
diverifikasi langsung oleh library `jose.jwtVerify` biasa yang dipakai di
backend Hono (yang mengharapkan JWT bertanda tangan sederhana, bukan
terenkripsi). Daripada memaksakan format yang sama di dua sistem yang
punya kebutuhan berbeda (cookie browser vs Bearer token API), token
dipisah sesuai fungsinya masing-masing — pola yang umum dipakai ketika
frontend dan backend adalah dua layanan/runtime yang berbeda.

## Alur lengkap

```
1. User isi form login -> signIn("credentials", ...) di app/login/page.tsx
2. Auth.js menjalankan authorize() di lib/auth.ts:
   - Cocokkan email + password (argon2id) ke tabel users via Neon
   - Cari schoolId sesuai role (teachers/students)
   - Kembalikan { id, email, role, schoolId }
3. Auth.js membuat token sesi (JWE) berisi role & schoolId, simpan di cookie
4. Server Component / Server Action perlu data dari backend Hono:
   -> panggil apiFetch() di lib/api-client.ts
   -> apiFetch mengambil session lewat auth()
   -> mint token API baru (HS256, 5 menit) lewat mintApiToken()
   -> kirim sebagai "Authorization: Bearer <token>" ke Cloudflare Workers
5. Middleware Hono (middleware/auth.ts) verifikasi token dengan AUTH_SECRET
   yang SAMA dengan yang dipakai Next.js -> isi c.set("user", payload)
6. Middleware RBAC (middleware/rbac.ts) mengecek permission sesuai role
```

## Yang wajib konsisten di kedua sisi

- `AUTH_SECRET` harus **identik** di `apps/web/.env.local` dan secret Cloudflare Workers.
- Bentuk payload (`AppJwtPayload` di `packages/shared/src/roles.ts`) harus dipakai sebagai
  satu-satunya sumber kebenaran bentuk token API, jangan didefinisikan ulang di tempat lain.
