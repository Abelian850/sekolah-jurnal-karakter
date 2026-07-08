import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { Topbar } from "@/components/topbar";
import { PesertaDidikNav } from "@/components/peserta-didik-nav";
import { apiFetch } from "@/lib/api-client";

export default async function PesertaDidikLayout({ children }: { children: React.ReactNode }) {
  // Hanya role peserta_didik yang boleh melihat apa pun di bawah
  // /dashboard/peserta-didik (pola sama dengan dashboard/admin/layout.tsx).
  await requireRole([ROLES.PESERTA_DIDIK]);

  // Badge jumlah notifikasi belum dibaca. Kegagalan di sini tidak boleh
  // menjatuhkan seluruh layout - cukup tampilkan tanpa badge.
  let unreadCount = 0;
  try {
    const res = await apiFetch<{ count: number }>("/notifications/unread-count");
    unreadCount = res.count;
  } catch {
    unreadCount = 0;
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <Topbar />
      <PesertaDidikNav unreadCount={unreadCount} />
      <main>{children}</main>
    </div>
  );
}
