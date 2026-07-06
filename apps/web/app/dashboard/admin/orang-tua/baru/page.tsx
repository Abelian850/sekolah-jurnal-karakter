import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

interface Student {
  id: string;
  fullName: string;
  className: string;
}

async function createParent(formData: FormData) {
  "use server";

  const studentIds = formData.getAll("studentIds") as string[];

  await apiFetch("/parents", {
    method: "POST",
    body: JSON.stringify({
      email: formData.get("email"),
      password: formData.get("password"),
      fullName: formData.get("fullName"),
      phone: formData.get("phone") || undefined,
      relation: formData.get("relation"),
      studentIds,
    }),
  });

  redirect("/dashboard/admin/orang-tua");
}

export default async function OrangTuaBaruPage() {
  const students = await apiFetch<Student[]>("/students");

  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Tambah Orang Tua</h1>

      {students.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada peserta didik. Tambahkan siswa terlebih dahulu sebelum membuat akun orang tua.
        </p>
      ) : (
        <form action={createParent} className="flex flex-col gap-4">
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
            <label className="mb-1 block text-sm font-medium">Relasi</label>
            <select
              name="relation"
              required
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              <option value="ayah">Ayah</option>
              <option value="ibu">Ibu</option>
              <option value="wali">Wali</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Peserta Didik Terkait (bisa lebih dari satu, mis. kakak-adik)
            </label>
            <select
              name="studentIds"
              multiple
              required
              size={Math.min(students.length, 6)}
              className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} - {s.className}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Tahan Ctrl/Cmd untuk memilih lebih dari satu.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Telepon (opsional)</label>
            <input
              name="phone"
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
