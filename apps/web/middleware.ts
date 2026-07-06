export { auth as middleware } from "@/lib/auth";

/**
 * CATATAN KEAMANAN: middleware TIDAK dijadikan satu-satunya lapisan proteksi
 * di aplikasi ini, karena pernah ditemukan celah (CVE-2025-29927) di mana
 * middleware Next.js bisa dilewati dengan memalsukan header
 * `x-middleware-subrequest`. Middleware ini hanya lapisan pertama (redirect
 * cepat jika belum login sama sekali). Pengecekan ROLE yang sesungguhnya
 * tetap dilakukan ulang di server - lihat `requireRole()` yang dipanggil di
 * setiap `layout.tsx` per-role (mis. app/dashboard/admin/layout.tsx) -
 * sehingga tetap aman meskipun middleware berhasil dilewati.
 */
export const config = {
  // Semua route di bawah /dashboard wajib punya session valid.
  // Auth.js otomatis redirect ke pages.signIn ("/login") jika belum login.
  matcher: ["/dashboard/:path*"],
};
