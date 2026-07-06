import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Topbar } from "@/components/topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Hanya role admin yang boleh melihat apa pun di bawah /dashboard/admin.
  await requireRole([ROLES.ADMIN]);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-6 p-6">
      <AdminSidebar />
      <div className="flex-1">
        <Topbar />
        <main>{children}</main>
      </div>
    </div>
  );
}
