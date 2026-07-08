import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { Topbar } from "@/components/topbar";
import { GuruWaliNav } from "@/components/guru-wali-nav";

export default async function GuruWaliLayout({ children }: { children: React.ReactNode }) {
  // Hanya role guru_wali yang boleh melihat apa pun di bawah
  // /dashboard/guru-wali (pola sama dengan dashboard/peserta-didik/layout.tsx).
  await requireRole([ROLES.GURU_WALI]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <Topbar />
      <GuruWaliNav />
      <main>{children}</main>
    </div>
  );
}
