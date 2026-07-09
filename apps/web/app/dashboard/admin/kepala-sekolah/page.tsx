import Link from "next/link";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";

interface Principal {
  id: string;
  fullName: string;
  phone: string | null;
  schoolId: string;
  schoolName: string;
  email: string;
  isActive: boolean;
}

async function deletePrincipal(id: string) {
  "use server";
  await apiFetch(`/principals/${id}`, { method: "DELETE" });
  revalidatePath("/dashboard/admin/kepala-sekolah");
}

export default async function KepalaSekolahListPage() {
  const principals = await apiFetch<Principal[]>("/principals");

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kepala Sekolah</h1>
        <Link
          href="/dashboard/admin/kepala-sekolah/baru"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          + Tambah Kepala Sekolah
        </Link>
      </div>

      {principals.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada kepala sekolah terdaftar. Akun kepala sekolah dibutuhkan
          agar dashboard analitik sekolah (Fase 7) dapat diakses.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Nama</th>
              <th className="py-2">Sekolah</th>
              <th className="py-2">Email</th>
              <th className="py-2">Telepon</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {principals.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-medium">{p.fullName}</td>
                <td className="py-2">{p.schoolName}</td>
                <td className="py-2">{p.email}</td>
                <td className="py-2">{p.phone ?? "-"}</td>
                <td className="py-2">
                  <form action={deletePrincipal.bind(null, p.id)}>
                    <button className="text-xs font-medium text-red-600 hover:underline">
                      Hapus akun
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
