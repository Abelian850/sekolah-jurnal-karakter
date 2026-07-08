import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

interface JournalTemplate {
  id: string;
  schoolId: string;
  name: string;
  isActive: boolean;
}

interface School {
  id: string;
  name: string;
}

export default async function JurnalTemplateListPage() {
  const [templates, schools] = await Promise.all([
    apiFetch<JournalTemplate[]>("/journal-templates"),
    apiFetch<School[]>("/schools"),
  ]);

  const schoolName = new Map(schools.map((s) => [s.id, s.name]));

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Template Jurnal</h1>
        <Link
          href="/dashboard/admin/jurnal-template/baru"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          + Buat Template
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada template jurnal.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Nama</th>
              <th className="py-2">Sekolah</th>
              <th className="py-2">Status</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-medium">{t.name}</td>
                <td className="py-2">{schoolName.get(t.schoolId) ?? "-"}</td>
                <td className="py-2">
                  {t.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      Aktif
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                      Tidak aktif
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <Link
                    href={`/dashboard/admin/jurnal-template/${t.id}`}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    Kelola
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
