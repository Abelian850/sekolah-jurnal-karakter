import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID, getTodayDateWIB } from "@/lib/date";
import { JournalItemsForm } from "@/components/journal-items-form";
import { JournalItemsView, type JournalItemData } from "@/components/journal-items-view";
import { createTodayJournal } from "./actions";

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
  draft: "Draf",
  submitted: "Terkirim - menunggu verifikasi Guru Wali",
  approved: "Disetujui Guru Wali",
  rejected: "Ditolak - hubungi Guru Wali",
};

export default async function JurnalHariIniPage() {
  const today = getTodayDateWIB();

  let data: {
    journal: Journal;
    items: JournalItemData[];
    verification: Verification | null;
  } | null = null;
  let profileMissing = false;
  try {
    data = await apiFetch<{
      journal: Journal;
      items: JournalItemData[];
      verification: Verification | null;
    } | null>(`/journals/today?date=${today}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) {
      profileMissing = true;
    } else {
      throw err;
    }
  }

  const needsRevision = data?.journal.status === "draft" && data.verification?.status === "revisi";

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Jurnal Hari Ini</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{formatDateID(today)}</p>

      {profileMissing ? (
        <p className="text-sm text-slate-500">
          Profil peserta didik untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      ) : data === null ? (
        <div>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Kamu belum membuat jurnal untuk hari ini.
          </p>
          <form action={createTodayJournal}>
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
              Buat Jurnal Hari Ini
            </button>
          </form>
        </div>
      ) : data.journal.status === "draft" ? (
        <div>
          {needsRevision && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <p className="font-medium">Guru Wali meminta revisi jurnal ini.</p>
              {data.verification?.note && (
                <p className="mt-1 whitespace-pre-wrap">{data.verification.note}</p>
              )}
              <p className="mt-1 text-xs">Perbaiki isianmu di bawah, lalu kirim ulang.</p>
            </div>
          )}
          <JournalItemsForm journalId={data.journal.id} items={data.items} />
        </div>
      ) : (
        <div>
          <p className="mb-4 inline-block rounded-full bg-green-100 px-3 py-1 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-400">
            {STATUS_LABELS[data.journal.status]}
          </p>
          {data.journal.status === "approved" && data.verification && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
              {data.verification.characterScore != null && (
                <p className="font-medium">Nilai karakter: {data.verification.characterScore}</p>
              )}
              {data.verification.note && (
                <p className="mt-1 whitespace-pre-wrap">{data.verification.note}</p>
              )}
            </div>
          )}
          {data.journal.status === "rejected" && data.verification?.note && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
              <p className="font-medium">Alasan penolakan:</p>
              <p className="mt-1 whitespace-pre-wrap">{data.verification.note}</p>
            </div>
          )}
          <JournalItemsView items={data.items} />
        </div>
      )}
    </div>
  );
}
