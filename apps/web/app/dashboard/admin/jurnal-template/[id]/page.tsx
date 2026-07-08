import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import {
  renameTemplate,
  activateTemplate,
  addTemplateItem,
  deleteTemplateItem,
  deleteTemplate,
} from "./actions";

interface TemplateItem {
  id: string;
  itemName: string;
  itemType: string;
  orderIndex: number;
}

interface TemplateDetail {
  id: string;
  schoolId: string;
  name: string;
  isActive: boolean;
  items: TemplateItem[];
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  checklist: "Checklist",
  waktu: "Waktu",
  catatan: "Catatan",
  foto: "Foto",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80";

export default async function JurnalTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await apiFetch<TemplateDetail>(`/journal-templates/${id}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/admin/jurnal-template"
              className="text-xs text-slate-500 hover:underline"
            >
              &larr; Kembali ke daftar template
            </Link>
            <h1 className="text-xl font-semibold">{template.name}</h1>
          </div>
          {template.isActive ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Aktif
            </span>
          ) : (
            <form action={activateTemplate.bind(null, template.id)}>
              <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
                Aktifkan Template
              </button>
            </form>
          )}
        </div>

        <form action={renameTemplate.bind(null, template.id)} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Nama Template</label>
            <input name="name" defaultValue={template.name} required minLength={3} className={inputClass} />
          </div>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            Simpan Nama
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold">Item Jurnal</h2>

        {template.items.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada item pada template ini.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                <th className="py-2">Urutan</th>
                <th className="py-2">Nama Item</th>
                <th className="py-2">Tipe</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {template.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2">{item.orderIndex + 1}</td>
                  <td className="py-2 font-medium">{item.itemName}</td>
                  <td className="py-2">{ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}</td>
                  <td className="py-2">
                    <form action={deleteTemplateItem.bind(null, template.id, item.id)}>
                      <button className="text-xs font-medium text-red-600 hover:underline">
                        Hapus
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form
          action={addTemplateItem.bind(null, template.id)}
          className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"
        >
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Nama Item Baru</label>
            <input name="itemName" required placeholder="Contoh: Membaca 15 menit" className={inputClass} />
          </div>
          <div className="w-44 shrink-0">
            <label className="mb-1 block text-sm font-medium">Tipe</label>
            <select name="itemType" required className={inputClass}>
              <option value="checklist">Checklist</option>
              <option value="waktu">Waktu</option>
              <option value="catatan">Catatan</option>
              <option value="foto">Foto</option>
            </select>
          </div>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
            + Tambah
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-2 text-lg font-semibold">Hapus Template</h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Hanya bisa dilakukan jika belum ada jurnal siswa yang memakai template ini. Jika sudah
          terpakai, nonaktifkan saja dengan mengaktifkan template lain.
        </p>
        <form action={deleteTemplate.bind(null, template.id)}>
          <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40">
            Hapus Template Ini
          </button>
        </form>
      </div>
    </div>
  );
}
