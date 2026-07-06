import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLES, type Role } from "@sjk/shared";

/**
 * Titik masuk tunggal setelah login. Mengarahkan pengguna ke dashboard
 * sesuai role-nya. Dashboard per-role yang sesungguhnya (Admin, Kepala
 * Sekolah, Guru Wali, dst.) dibangun modul demi modul mulai Fase 3.
 * Untuk Fase 2, setiap tujuan masih berupa placeholder yang membuktikan
 * bahwa RBAC & session berjalan end-to-end.
 */
const ROLE_REDIRECT: Record<Role, string> = {
  [ROLES.ADMIN]: "/dashboard/admin",
  [ROLES.KEPALA_SEKOLAH]: "/dashboard/kepala-sekolah",
  [ROLES.GURU_WALI]: "/dashboard/guru-wali",
  [ROLES.GURU]: "/dashboard/guru",
  [ROLES.ORANG_TUA]: "/dashboard/orang-tua",
  [ROLES.PESERTA_DIDIK]: "/dashboard/peserta-didik",
};

export default async function DashboardEntryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: Role }).role;

  if (!role || !ROLE_REDIRECT[role]) {
    redirect("/login");
  }

  redirect(ROLE_REDIRECT[role]);
}
