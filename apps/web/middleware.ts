export { auth as middleware } from "@/lib/auth";

export const config = {
  // Semua route di bawah /dashboard wajib punya session valid.
  // Auth.js otomatis redirect ke pages.signIn ("/login") jika belum login.
  matcher: ["/dashboard/:path*"],
};
