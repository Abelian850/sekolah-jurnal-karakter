import Link from "next/link";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

interface AcademicYear {
  id: string;
  schoolId: string;
  year: string;
  isActive: boolean;
}

async function activateAcademicYear(id: string) {
  "use server";
  await apiFetch(`/academic-years/${id}/activate`, { method: "PATCH" });
  revalidatePath("/dashboard/admin/tahun-ajaran");
}

export default async function TahunAjaranListPage() {
  const academicYears = await apiFetch<AcademicYear[]>("/academic-years");

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tahun Pelajaran</h1>
        <Link
          href="/dashboard/admin/tahun-ajaran/baru"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          + Tambah Tahun Pelajaran
        </Link>
      </div>

      {academicYears.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada tahun pelajaran.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Tahun</th>
              <th className="py-2">Status</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {academicYears.map((ay) => (
              <tr key={ay.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-medium">{ay.year}</td>
                <td className="py-2">
                  {ay.isActive ? (
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
                  {!ay.isActive && (
                    <form action={activateAcademicYear.bind(null, ay.id)}>
                      <button className="text-xs font-medium text-brand-600 hover:underline">
                        Aktifkan
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
