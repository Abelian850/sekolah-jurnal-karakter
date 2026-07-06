import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

interface School {
  id: string;
  name: string;
  npsn: string | null;
  address: string | null;
}

export default async function SekolahListPage() {
  const schools = await apiFetch<School[]>("/schools");

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sekolah</h1>
        <Link
          href="/dashboard/admin/sekolah/baru"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          + Tambah Sekolah
        </Link>
      </div>

      {schools.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada sekolah terdaftar.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Nama</th>
              <th className="py-2">NPSN</th>
              <th className="py-2">Alamat</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-medium">{school.name}</td>
                <td className="py-2">{school.npsn ?? "-"}</td>
                <td className="py-2">{school.address ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
