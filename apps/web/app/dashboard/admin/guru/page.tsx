import Link from "next/link";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { ResetTeacherPasswordButton } from "@/components/reset-teacher-password-button";

interface Teacher {
  id: string;
  fullName: string;
  nip: string | null;
  phone: string | null;
  isGuruWali: boolean;
}

async function toggleGuruWali(id: string) {
  "use server";
  // Path harus sama persis dengan rute API: PATCH /teachers/:id/toggle-wali
  // (dulu salah "toggle-guru-wali" sehingga tombol tidak pernah bekerja).
  await apiFetch(`/teachers/${id}/toggle-wali`, { method: "PATCH" });
  revalidatePath("/dashboard/admin/guru");
}

export default async function GuruListPage() {
  const teachers = await apiFetch<Teacher[]>("/teachers");

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Guru</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/admin/guru/impor"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Impor Excel
          </Link>
          <Link
            href="/dashboard/admin/guru/baru"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            + Tambah Guru
          </Link>
        </div>
      </div>

      {teachers.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada guru terdaftar.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Nama</th>
              <th className="py-2">NIP</th>
              <th className="py-2">Telepon</th>
              <th className="py-2">Status Guru Wali</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-medium">{t.fullName}</td>
                <td className="py-2">{t.nip ?? "-"}</td>
                <td className="py-2">{t.phone ?? "-"}</td>
                <td className="py-2">
                  {t.isGuruWali ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                      Guru Wali
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                      Guru Biasa
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <form action={toggleGuruWali.bind(null, t.id)}>
                      <button className="text-xs font-medium text-brand-600 hover:underline">
                        {t.isGuruWali ? "Cabut status Guru Wali" : "Jadikan Guru Wali"}
                      </button>
                    </form>
                    <ResetTeacherPasswordButton
                      teacherId={t.id}
                      teacherName={t.fullName}
                      nip={t.nip}
                    />
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
