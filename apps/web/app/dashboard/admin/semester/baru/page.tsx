import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface AcademicYear {
  id: string;
  year: string;
}

async function createSemester(formData: FormData) {
  "use server";

  await apiFetch("/semesters", {
    method: "POST",
    body: JSON.stringify({
      academicYearId: formData.get("academicYearId"),
      name: formData.get("name"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
    }),
  });

  redirect("/dashboard/admin/semester");
}

export default async function SemesterBaruPage() {
  const academicYears = await apiFetch<AcademicYear[]>("/academic-years");

  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Tambah Semester</h1>

      {academicYears.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada tahun pelajaran. Tambahkan tahun pelajaran terlebih dahulu.
        </p>
      ) : (
        <form action={createSemester} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tahun Pelajaran</label>
            <select
              name="academicYearId"
              required
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nama Semester</label>
            <select
              name="name"
              required
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Mulai</label>
              <input
                type="date"
                name="startDate"
                required
                className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Selesai</label>
              <input
                type="date"
                name="endDate"
                required
                className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
              />
            </div>
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
