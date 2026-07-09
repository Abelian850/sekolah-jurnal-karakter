import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { formatDateID } from "@/lib/date";
import { JournalItemsView, type JournalItemData } from "@/components/journal-items-view";
import { createComment } from "./actions";

interface JournalDetail {
  journal: {
    id: string;
    studentId: string;
    journalDate: string;
    status: "draft" | "submitted" | "approved" | "rejected";
    submittedAt: string | null;
  };
  student: { id: string; fullName: string; className: string };
  items: JournalItemData[];
  verification: {
    status: "disetujui" | "ditolak" | "revisi";
    note: string | null;
    characterScore: number | null;
    verifiedAt: string;
  } | null;
  comments: {
    id: string;
    userId: string;
    body: string;
    createdAt: string;
    authorRole: string;
    authorName: string;
  }[];
}

const VERIF_BADGE: Record<string, { label: string; className: string }> = {
  disetujui: {
    label: "Disetujui",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  revisi: {
    label: "Perlu Revisi",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  ditolak: {
    label: "Ditolak",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

const ROLE_LABEL: Record<string, string> = {
  orang_tua: "Orang Tua",
  guru_wali: "Guru Wali",
  guru: "Guru",
  peserta_didik: "Peserta Didik",
  kepala_sekolah: "Kepala Sekolah",
  admin: "Admin",
};

function formatDateTimeID(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function JurnalAnakDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await apiFetch<JournalDetail>(`/children/journals/${id}`);
  const { journal, student, items, verification, comments } = detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel rounded-2xl p-6">
        <Link
          href={`/dashboard/orang-tua/anak/${student.id}`}
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          &larr; Kembali ke riwayat {student.fullName}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          Jurnal {formatDateID(journal.journalDate)}
        </h1>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {student.fullName} · Kelas {student.className}
        </p>

        <JournalItemsView items={items} />
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-3 text-base font-semibold">Hasil Penilaian Guru Wali</h2>
        {verification ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${VERIF_BADGE[verification.status].className}`}
              >
                {VERIF_BADGE[verification.status].label}
              </span>
              {verification.characterScore != null && (
                <p className="text-sm">
                  Nilai karakter: <span className="font-semibold">{verification.characterScore}</span>
                </p>
              )}
            </div>
            {verification.note && (
              <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                Catatan: {verification.note}
              </p>
            )}
            <p className="text-xs text-slate-400">
              Diverifikasi {formatDateTimeID(verification.verifiedAt)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Jurnal ini belum diperiksa oleh Guru Wali.
          </p>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="mb-1 text-base font-semibold">Komentar</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Komentar Anda dapat dilihat oleh anak dan Guru Wali.
        </p>

        {comments.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">Belum ada komentar.</p>
        ) : (
          <ul className="mb-4 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {comments.map((comment) => (
              <li key={comment.id} className="py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{comment.authorName}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {ROLE_LABEL[comment.authorRole] ?? comment.authorRole}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">
                  {comment.body}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatDateTimeID(comment.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form action={createComment.bind(null, journal.id)} className="flex flex-col gap-2">
          <textarea
            name="body"
            required
            maxLength={2000}
            rows={3}
            placeholder="Tulis komentar untuk anak dan Guru Wali…"
            className="w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          />
          <button
            type="submit"
            className="self-end rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Kirim Komentar
          </button>
        </form>
      </div>
    </div>
  );
}
