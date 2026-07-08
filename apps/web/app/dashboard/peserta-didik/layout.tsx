import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { Topbar } from "@/components/topbar";
import { PesertaDidikNav } from "@/components/peserta-didik-nav";

export default async function PesertaDidikLayout({ children }: { children: React.ReactNode }) {
  // Hanya role peserta_didik yang boleh melihat apa pun di bawah
  // /dashboard/peserta-didik (pola sama dengan dashboard/admin/layout.tsx).
  await requireRole([ROLES.PESERTA_DIDIK]);

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <Topbar />
      <PesertaDidikNav />
      <main>{children}</main>
    </div>
  );
}
