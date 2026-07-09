import { apiFetch } from "@/lib/api-client";
import { markAllNotificationsRead } from "./actions";

interface Notification {
  id: string;
  type: "belum_isi_jurnal" | "disetujui" | "ditolak" | "revisi" | "komentar";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_DOT: Record<Notification["type"], string> = {
  disetujui: "bg-green-500",
  revisi: "bg-amber-500",
  ditolak: "bg-red-500",
  belum_isi_jurnal: "bg-blue-500",
  komentar: "bg-slate-400",
};

function formatDateTimeID(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function NotifikasiOrangTuaPage() {
  const items = await apiFetch<Notification[]>("/notifications");
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifikasi</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              Tandai semua terbaca
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada notifikasi.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((n) => (
            <li key={n.id} className="flex gap-3 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_DOT[n.type]}`} />
              <div className={n.isRead ? "opacity-60" : ""}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                  {n.message}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{formatDateTimeID(n.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
