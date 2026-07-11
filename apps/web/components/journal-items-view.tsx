export interface JournalItemData {
  id: string;
  journalId: string;
  templateItemId: string;
  status: "selesai" | "belum" | "sebagian";
  recordedTime: string | null;
  note: string | null;
  photoUrl: string | null;
  itemName: string;
  itemType: string;
  orderIndex: number;
  description?: string | null;
  requiresPhoto?: boolean;
}

const STATUS_BADGE: Record<JournalItemData["status"], { label: string; className: string }> = {
  selesai: {
    label: "Selesai",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  sebagian: {
    label: "Sebagian",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  belum: {
    label: "Belum",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
};

/**
 * Tampilan read-only item jurnal. Dipakai di halaman "Jurnal Hari Ini"
 * (setelah submit) dan halaman detail riwayat - satu komponen yang sama
 * agar data yang dilihat siswa konsisten di kedua tempat.
 */
export function JournalItemsView({ items }: { items: JournalItemData[] }) {
  return (
    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => {
        const badge = STATUS_BADGE[item.status];

        return (
          <li key={item.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{item.itemName}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            {item.recordedTime && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Waktu: {item.recordedTime.slice(0, 5)}
              </p>
            )}
            {item.note && (
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                {item.note}
              </p>
            )}
            {item.photoUrl && (
              <a
                href={item.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-brand-600 hover:underline"
              >
                Lihat foto
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
