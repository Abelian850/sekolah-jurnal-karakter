import { findHabitQuestionSet, visibleQuestions } from "@sjk/shared";

export interface JournalItemData {
  id: string;
  journalId: string;
  templateItemId: string;
  status: "selesai" | "belum" | "sebagian";
  recordedTime: string | null;
  note: string | null;
  photoUrl: string | null;
  /**
   * Jawaban model formulir (revisi Juli 2026 tahap 2). NULL/undefined =
   * data lama (model status/keterangan) yang tetap dirender gaya lama.
   */
  answers?: Record<string, string> | null;
  itemName: string;
  itemType: string;
  orderIndex: number;
  description?: string | null;
  requiresPhoto?: boolean;
}

// Badge "sebagian" dipertahankan HANYA untuk data lama - isian baru tidak
// pernah menghasilkan status ini lagi.
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
 * Daftar pasangan pertanyaan-jawaban untuk satu item, urut sesuai definisi
 * set pertanyaan (hanya pertanyaan yang tampil menurut jawaban). Jawaban
 * dengan key tak dikenal (mis. definisi berubah) tetap ditampilkan di
 * akhir agar tidak ada data yang tersembunyi dari Guru Wali.
 */
function answerPairs(itemName: string, answers: Record<string, string>) {
  const set = findHabitQuestionSet(itemName);
  if (!set) {
    return Object.entries(answers).map(([key, value]) => ({ key, label: key, value }));
  }
  const known = visibleQuestions(set, answers)
    .filter((q) => (answers[q.key] ?? "").trim() !== "")
    .map((q) => ({ key: q.key, label: q.label, value: answers[q.key] }));
  const knownKeys = new Set(set.questions.map((q) => q.key));
  const unknown = Object.entries(answers)
    .filter(([key, value]) => !knownKeys.has(key) && value.trim() !== "")
    .map(([key, value]) => ({ key, label: key, value }));
  return [...known, ...unknown];
}

/**
 * Tampilan read-only item jurnal. Dipakai di halaman "Jurnal Hari Ini"
 * (setelah submit), detail riwayat siswa, verifikasi Guru Wali, dan detail
 * jurnal Orang Tua - satu komponen yang sama agar data yang dilihat semua
 * pihak konsisten. Item ber-answers dirender sebagai daftar tanya-jawab;
 * item lama (answers kosong) dirender gaya lama (status/waktu/keterangan).
 */
export function JournalItemsView({ items }: { items: JournalItemData[] }) {
  return (
    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
      {items.map((item) => {
        const badge = STATUS_BADGE[item.status];
        const pairs = item.answers ? answerPairs(item.itemName, item.answers) : [];

        return (
          <li key={item.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{item.itemName}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            {pairs.length > 0 ? (
              <dl className="flex flex-col gap-1">
                {pairs.map((p) => (
                  <div key={p.key}>
                    <dt className="text-xs text-slate-500">{p.label}</dt>
                    <dd className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                      {p.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <>
                {item.recordedTime && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Waktu: {item.recordedTime.slice(0, 5)}
                  </p>
                )}
              </>
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
