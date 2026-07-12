import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { ExportStudentsButton } from "@/components/export-students-button";
import { ResetStudentPasswordButton } from "@/components/reset-student-password-button";
import { DeleteStudentButton } from "@/components/delete-student-button";

interface Student {
  id: string;
  nis: string;
  nisn: string | null;
  fullName: string;
  className: string;
  gradeLevel: string;
  gender: string | null;
  isActive: boolean;
  status: string; // "aktif" | "lulus" | "pindah" | "keluar"
}

const STATUS_LABEL: Record<string, string> = {
  lulus: "Alumni",
  pindah: "Pindah",
  keluar: "Keluar",
};

export default async function SiswaListPage({
  searchParams,
}: {
  searchParams: Promise<{ tampilkan?: string }>;
}) {
  // Default hanya siswa aktif; ?tampilkan=semua menyertakan alumni/nonaktif
  // (fitur Kelulusan — alumni tidak dihapus, hanya disembunyikan).
  const { tampilkan } = await searchParams;
  const showAll = tampilkan === "semua";
  const students = await apiFetch<Student[]>(
    showAll ? "/students?includeInactive=true" : "/students"
  );

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Peserta Didik</h1>
          <Link
            href={showAll ? "/dashboard/admin/siswa" : "/dashboard/admin/siswa?tampilkan=semua"}
            className="text-xs text-brand-600 hover:underline"
          >
            {showAll ? "Sembunyikan alumni/nonaktif" : "Tampilkan alumni/nonaktif"}
          </Link>
        </div>
        <div className="flex gap-2">
          <ExportStudentsButton students={students} />
          <Link
            href="/dashboard/admin/siswa/impor"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Impor Excel
          </Link>
          <Link
            href="/dashboard/admin/siswa/hapus-massal"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
          >
            Hapus Massal
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
              <th className="py-2">NISN</th>
              <th className="py-2">Nama</th>
              <th className="py-2">Kelas</th>
              <th className="py-2">Angkatan</th>
              {showAll && <th className="py-2">Status</th>}
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2">{s.nis}</td>
                <td className="py-2">{s.nisn ?? "-"}</td>
                <td className="py-2 font-medium">{s.fullName}</td>
                <td className="py-2">{s.className}</td>
                <td className="py-2">{s.gradeLevel}</td>
                {showAll && (
                  <td className="py-2">
                    {s.isActive ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Aktif
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {STATUS_LABEL[s.status] ?? "Nonaktif"}
                      </span>
                    )}
                  </td>
                )}
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <ResetStudentPasswordButton
                      studentId={s.id}
                      studentName={s.fullName}
                      nisn={s.nisn}
                    />
                    <DeleteStudentButton studentId={s.id} studentName={s.fullName} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
