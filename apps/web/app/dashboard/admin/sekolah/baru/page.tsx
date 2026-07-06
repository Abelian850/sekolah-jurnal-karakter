import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

async function createSchool(formData: FormData) {
  "use server";

  await apiFetch("/schools", {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      npsn: formData.get("npsn") || undefined,
      address: formData.get("address") || undefined,
    }),
  });

  redirect("/dashboard/admin/sekolah");
}

export default function SekolahBaruPage() {
  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Tambah Sekolah</h1>

      <form action={createSchool} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nama Sekolah</label>
          <input
            name="name"
            required
            minLength={3}
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">NPSN (opsional)</label>
          <input
            name="npsn"
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Alamat (opsional)</label>
          <textarea
            name="address"
            rows={3}
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
    </div>
  );
}
