import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface School {
  id: string;
  name: string;
}

async function createTeacher(formData: FormData) {
  "use server";

  await apiFetch("/teachers", {
    method: "POST",
    body: JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password"),
      schoolId: formData.get("schoolId"),
      nip: formData.get("nip") || undefined,
      fullName: formData.get("fullName"),
      phone: formData.get("phone") || undefined,
      isGuruWali: formData.get("isGuruWali") === "on",
    }),
  });

  redirect("/dashboard/admin/guru");
}

export default async function GuruBaruPage() {
  const schools = await apiFetch<School[]>("/schools");

  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Tambah Guru</h1>

      <form action={createTeacher} className="flex flex-col gap-4">
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

        <div>
          <label className="mb-1 block text-sm font-medium">Email (untuk login)</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Kata Sandi Awal</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">NIP (opsional)</label>
          <input
            name="nip"
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Telepon (opsional)</label>
          <input
            name="phone"
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isGuruWali" className="rounded" />
          Jadikan Guru Wali sejak awal
        </label>

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
