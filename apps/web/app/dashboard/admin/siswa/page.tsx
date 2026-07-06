import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { ExportStudentsButton } from "@/components/export-students-button";

interface Student {
  id: string;
  nis: string;
  nisn: string | null;
  fullName: string;
  className: string;
  gradeLevel: string;
  gender: string | null;
  isActive: boolean;
}

export default async function SiswaListPage() {
  const students = await apiFetch<Student[]>("/students");

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Peserta Didik</h1>
        <div className="flex gap-2">
          <ExportStudentsButton students={students} />
          <Link
            href="/dashboard/admin/siswa/impor"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Impor Excel
          </Link>
          <Link
            href="/dashboard/admin/siswa/baru"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            + Tambah Siswa
          </Link>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada peserta didik terdaftar.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">NIS</th>
              <th className="py-2">Nama</th>
              <th className="py-2">Kelas</th>
              <th className="py-2">Angkatan</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2">{s.nis}</td>
                <td className="py-2 font-medium">{s.fullName}</td>
                <td className="py-2">{s.className}</td>
                <td className="py-2">{s.gradeLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
