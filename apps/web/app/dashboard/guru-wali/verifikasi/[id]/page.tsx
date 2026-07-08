import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID } from "@/lib/date";
import { JournalItemsView, type JournalItemData } from "@/components/journal-items-view";
import { VerificationForm } from "@/components/verification-form";

interface Journal {
  id: string;
  journalDate: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt: string | null;
}

interface StudentInfo {
  id: string;
  fullName: string;
  className: string;
  nis: string;
}

interface Verification {
  id: string;
  status: "disetujui" | "ditolak" | "revisi";
  note: string | null;
  characterScore: number | null;
  verifiedAt: string;
}

const VERIFICATION_LABELS: Record<Verification["status"], string> = {
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  revisi: "Dikembalikan untuk revisi",
};

export default async function VerifikasiJurnalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: {
    journal: Journal;
    student: StudentInfo;
    items: JournalItemData[];
    verification: Verification | null;
  };
  try {
    data = await apiFetch(`/verifications/journals/${id}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) notFound();
    throw err;
  }

  const { journal, student, items, verification } = data;

  return (
    <div className="glass-panel rounded-2xl p-6">
      <Link href="/dashboard/guru-wali" className="text-xs text-slate-500 hover:underline">
        &larr; Kembali ke daftar
      </Link>
      <h1 className="mb-1 mt-1 text-xl font-semibold">{formatDateID(journal.journalDate)}</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {student.fullName} &middot; Kelas {student.className} &middot; NIS {student.nis}
      </p>

      {verification && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-medium">
            Riwayat: {VERIFICATION_LABELS[verification.status]}
            {verification.characterScore != null && ` (nilai ${verification.characterScore})`}
          </p>
          {verification.note && <p className="mt-1 whitespace-pre-wrap">{verification.note}</p>}
          {journal.status === "submitted" && verification.status === "revisi" && (
            <p className="mt-1 text-xs">
              Siswa sudah memperbaiki dan mengirim ulang jurnal ini - periksa kembali di bawah.
            </p>
          )}
        </div>
      )}

      <JournalItemsView items={items} />

      {journal.status === "submitted" ? (
        <VerificationForm journalId={journal.id} />
      ) : (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500 dark:border-slate-800">
          {journal.status === "draft"
            ? "Jurnal ini sedang diperbaiki siswa (status draf) dan belum bisa diverifikasi."
            : "Jurnal ini sudah diverifikasi final."}
        </p>
      )}
    </div>
  );
}
