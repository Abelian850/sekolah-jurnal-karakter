import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

interface Parent {
  id: string;
  fullName: string;
  phone: string | null;
  relation: string | null;
}

export default async function OrangTuaListPage() {
  const parents = await apiFetch<Parent[]>("/parents");

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orang Tua</h1>
        <Link
          href="/dashboard/admin/orang-tua/baru"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          + Tambah Orang Tua
        </Link>
      </div>

      {parents.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada akun orang tua terdaftar.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Nama</th>
              <th className="py-2">Relasi</th>
              <th className="py-2">Telepon</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-medium">{p.fullName}</td>
                <td className="py-2 capitalize">{p.relation ?? "-"}</td>
                <td className="py-2">{p.phone ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
