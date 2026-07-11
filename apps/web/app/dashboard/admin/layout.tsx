import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Topbar } from "@/components/topbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Hanya role admin yang boleh melihat apa pun di bawah /dashboard/admin.
  await requireRole([ROLES.ADMIN]);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <Topbar />
        <main>{children}</main>
      </div>
    </div>
  );
}
