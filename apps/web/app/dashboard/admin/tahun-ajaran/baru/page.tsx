import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface School {
  id: string;
  name: string;
}

async function createAcademicYear(formData: FormData) {
  "use server";

  await apiFetch("/academic-years", {
    method: "POST",
    body: JSON.stringify({
      schoolId: formData.get("schoolId"),
      year: formData.get("year"),
    }),
  });

  redirect("/dashboard/admin/tahun-ajaran");
}

export default async function TahunAjaranBaruPage() {
  const schools = await apiFetch<School[]>("/schools");

  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Tambah Tahun Pelajaran</h1>

      {schools.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada sekolah. Tambahkan sekolah terlebih dahulu di menu Sekolah.
        </p>
      ) : (
        <form action={createAcademicYear} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Sekolah</label>
            <select
              name="schoolId"
              required
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tahun Pelajaran</label>
            <input
              name="year"
              required
              placeholder="2026/2027"
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            />
          </div>

          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Simpan
          </button>
        </form>
      )}
    </div>
  );
}
