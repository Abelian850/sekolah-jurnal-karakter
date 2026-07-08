import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID } from "@/lib/date";
import { JournalItemsView, type JournalItemData } from "@/components/journal-items-view";

interface Journal {
  id: string;
  journalDate: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt: string | null;
}

interface Verification {
  status: "disetujui" | "ditolak" | "revisi";
  note: string | null;
  characterScore: number | null;
}

const STATUS_LABELS: Record<Journal["status"], string> = {
  draft: "Draf - belum dikirim",
  submitted: "Terkirim - menunggu verifikasi Guru Wali",
  approved: "Disetujui Guru Wali",
  rejected: "Ditolak - hubungi Guru Wali",
};

export default async function RiwayatJurnalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: { journal: Journal; items: JournalItemData[]; verification: Verification | null };
  try {
    data = await apiFetch<{
      journal: Journal;
      items: JournalItemData[];
      verification: Verification | null;
    }>(`/journals/${id}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) notFound();
    throw err;
  }

  const { journal, items, verification } = data;

  return (
    <div className="glass-panel rounded-2xl p-6">
      <Link href="/dashboard/peserta-didik/riwayat" className="text-xs text-slate-500 hover:underline">
        &larr; Kembali ke riwayat
      </Link>
      <h1 className="mb-1 mt-1 text-xl font-semibold">{formatDateID(journal.journalDate)}</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {STATUS_LABELS[journal.status]}
      </p>

      {journal.status === "approved" && verification && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
          {verification.characterScore != null && (
            <p className="font-medium">Nilai karakter: {verification.characterScore}</p>
          )}
          {verification.note && <p className="mt-1 whitespace-pre-wrap">{verification.note}</p>}
        </div>
      )}
      {journal.status === "rejected" && verification?.note && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-medium">Alasan penolakan:</p>
          <p className="mt-1 whitespace-pre-wrap">{verification.note}</p>
        </div>
      )}
      {journal.status === "draft" && verification?.status === "revisi" && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-medium">Guru Wali meminta revisi jurnal ini.</p>
          {verification.note && <p className="mt-1 whitespace-pre-wrap">{verification.note}</p>}
        </div>
      )}

      <JournalItemsView items={items} />
    </div>
  );
}
