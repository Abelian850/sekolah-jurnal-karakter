import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { Topbar } from "@/components/topbar";
import { OrangTuaNav } from "@/components/orang-tua-nav";
import { apiFetch } from "@/lib/api-client";

export default async function OrangTuaLayout({ children }: { children: React.ReactNode }) {
  // Hanya role orang_tua yang boleh melihat apa pun di bawah
  // /dashboard/orang-tua (pola sama dengan dashboard/peserta-didik/layout.tsx).
  await requireRole([ROLES.ORANG_TUA]);

  // Badge jumlah notifikasi belum dibaca; kegagalan tidak menjatuhkan layout.
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
      <OrangTuaNav unreadCount={unreadCount} />
      <main>{children}</main>
    </div>
  );
}
