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

  let data: { journal: Journal; items: JournalItemData[] };
  try {
    data = await apiFetch<{ journal: Journal; items: JournalItemData[] }>(`/journals/${id}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) notFound();
    throw err;
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <Link href="/dashboard/peserta-didik/riwayat" className="text-xs text-slate-500 hover:underline">
        &larr; Kembali ke riwayat
      </Link>
      <h1 className="mb-1 mt-1 text-xl font-semibold">{formatDateID(data.journal.journalDate)}</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {STATUS_LABELS[data.journal.status]}
      </p>

      <JournalItemsView items={data.items} />
    </div>
  );
}
