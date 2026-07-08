import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface School {
  id: string;
  name: string;
}

async function createStudent(formData: FormData) {
  "use server";

  await apiFetch("/students", {
    method: "POST",
    body: JSON.stringify({
      schoolId: formData.get("schoolId"),
      nis: formData.get("nis"),
      nisn: formData.get("nisn"),
      fullName: formData.get("fullName"),
      className: formData.get("className"),
      gradeLevel: formData.get("gradeLevel"),
      gender: formData.get("gender") || undefined,
      birthDate: formData.get("birthDate") || undefined,
    }),
  });

  redirect("/dashboard/admin/siswa");
}

export default async function SiswaBaruPage() {
  const schools = await apiFetch<School[]>("/schools");

  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Tambah Peserta Didik</h1>

      <form action={createStudent} className="flex flex-col gap-4">
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
          <label className="mb-1 block text-sm font-medium">Nama Lengkap</label>
          <input
            name="fullName"
            required
            minLength={3}
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">NIS</label>
            <input
              name="nis"
              required
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">NISN</label>
            <input
              name="nisn"
              required
              pattern="\d{5,30}"
              title="NISN berupa 5-30 digit angka"
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Kelas</label>
            <input
              name="className"
              required
              placeholder="VII A"
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Angkatan</label>
            <input
              name="gradeLevel"
              required
              placeholder="VII"
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Jenis Kelamin</label>
            <select
              name="gender"
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              <option value="">-</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tanggal Lahir</label>
            <input
              type="date"
              name="birthDate"
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            />
          </div>
        </div>

        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
          Akun login dibuat otomatis: siswa masuk dengan <strong>NISN</strong> sebagai
          username sekaligus kata sandi awal. Tidak perlu mengisi email.
        </p>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Simpan
        </button>
      </form>
    </div>
  );
}
