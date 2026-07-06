import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Role } from "@sjk/shared";

/**
 * Dipanggil di awal setiap layout.tsx per-role (mis. dashboard/admin/layout.tsx)
 * sebagai pertahanan berlapis di atas middleware.ts (yang hanya mengecek
 * "sudah login atau belum", bukan role spesifik). Jika session tidak ada
 * atau role tidak cocok, langsung redirect ke /login - tidak pernah
 * merender konten halaman yang dilindungi sedikit pun.
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();

  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect("/login");
  }

  return session;
}
