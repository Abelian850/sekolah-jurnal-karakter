import { requireRole } from "@/lib/require-role";
import { ROLES } from "@sjk/shared";
import { Topbar } from "@/components/topbar";

export default async function Page() {
  await requireRole([ROLES.GURU]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Topbar />
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Dashboard Guru Mata Pelajaran</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Modul ini akan dibangun pada Fase 6 sesuai roadmap proyek.
        </p>
      </div>
    </div>
  );
}
