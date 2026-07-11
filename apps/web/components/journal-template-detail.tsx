import Link from "next/link";
import { FIXED_JOURNAL_ITEM_NAMES } from "@sjk/shared";
import {
  renameTemplate,
  activateTemplate,
  addTemplateItem,
  setItemRequiresPhoto,
  deleteTemplateItem,
  deleteTemplate,
} from "@/lib/template-actions";

export interface TemplateItem {
  id: string;
  itemName: string;
  itemType: string;
  orderIndex: number;
  description: string | null;
  requiresPhoto: boolean;
}

export interface TemplateDetail {
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

/**
 * Tampilan kelola satu template jurnal - dipakai Admin
 * (/dashboard/admin/jurnal-template/[id]) dan Guru Wali
 * (/dashboard/guru-wali/template/[id]). `basePath` menentukan tautan
 * kembali dan revalidate path pada server actions bersama
 * (lib/template-actions.ts).
 *
 * Revisi Juli 2026: 7 item tetap ditandai terkunci (tidak bisa dihapus),
 * setiap item menampilkan keterangan contoh, dan kolom "Bukti Foto"
 * menandai item yang butuh foto secara default (Bukti Harian per tanggal
 * tetap menang - lihat halaman Bukti Harian guru wali).
 */
export function JournalTemplateDetailView({
  template,
  basePath,
}: {
  template: TemplateDetail;
  basePath: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Link href={basePath} className="text-xs text-slate-500 hover:underline">
              &larr; Kembali ke daftar template
            </Link>
            <h1 className="text-xl font-semibold">{template.name}</h1>
          </div>
          {template.isActive ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Aktif
            </span>
          ) : (
            <form action={activateTemplate.bind(null, basePath, template.id)}>
              <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
                Aktifkan Template
              </button>
            </form>
          )}
        </div>

        <form
          action={renameTemplate.bind(null, basePath, template.id)}
          className="flex items-end gap-2"
        >
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
        <h2 className="mb-1 text-lg font-semibold">Item Jurnal</h2>
        <p className="mb-4 text-xs text-slate-500">
          7 kebiasaan tetap terkunci dan tidak bisa dihapus. Centang &quot;Bukti Foto&quot; untuk
          mewajibkan foto pada item itu setiap hari (Bukti Harian per tanggal tetap diutamakan).
        </p>

        {template.items.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada item pada template ini.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                <th className="py-2">Urutan</th>
                <th className="py-2">Nama Item &amp; Keterangan</th>
                <th className="py-2">Tipe</th>
                <th className="py-2">Bukti Foto</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {template.items.map((item) => {
                const isFixed = FIXED_JOURNAL_ITEM_NAMES.includes(item.itemName);
                return (
                  <tr key={item.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                    <td className="py-2">{item.orderIndex + 1}</td>
                    <td className="py-2">
                      <p className="font-medium">
                        {item.itemName}
                        {isFixed && (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500 dark:bg-slate-800">
                            Tetap
                          </span>
                        )}
                      </p>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                      )}
                    </td>
                    <td className="py-2">{ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}</td>
                    <td className="py-2">
                      <form
                        action={setItemRequiresPhoto.bind(
                          null,
                          basePath,
                          template.id,
                          item.id,
                          !item.requiresPhoto
                        )}
                      >
                        <button
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.requiresPhoto
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-500"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                          }`}
                          title="Klik untuk mengubah"
                        >
                          {item.requiresPhoto ? "Wajib foto" : "Tidak wajib"}
                        </button>
                      </form>
                    </td>
                    <td className="py-2">
                      {isFixed ? (
                        <span className="text-xs text-slate-400">-</span>
                      ) : (
                        <form action={deleteTemplateItem.bind(null, basePath, template.id, item.id)}>
                          <button className="text-xs font-medium text-red-600 hover:underline">
                            Hapus
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <form
          action={addTemplateItem.bind(null, basePath, template.id)}
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"
        >
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-sm font-medium">Nama Item Baru</label>
            <input name="itemName" required placeholder="Contoh: Membaca 15 menit" className={inputClass} />
          </div>
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-sm font-medium">Keterangan contoh (opsional)</label>
            <input name="description" placeholder="Contoh: membaca buku non-pelajaran" className={inputClass} />
          </div>
          <div className="w-40 shrink-0">
            <label className="mb-1 block text-sm font-medium">Tipe</label>
            <select name="itemType" required className={inputClass}>
              <option value="checklist">Checklist</option>
              <option value="waktu">Waktu</option>
              <option value="catatan">Catatan</option>
              <option value="foto">Foto</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="requiresPhoto" className="rounded" />
            Wajib foto
          </label>
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
        <form action={deleteTemplate.bind(null, basePath, template.id)}>
          <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40">
            Hapus Template Ini
          </button>
        </form>
      </div>
    </div>
  );
}
