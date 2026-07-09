export interface CommentData {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  authorRole: string;
  authorName: string;
}

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

/**
 * Daftar komentar read-only (Fase 7). Dipakai di halaman periksa Guru Wali
 * dan detail riwayat siswa; form KIRIM komentar hanya ada di dashboard
 * Orang Tua (satu-satunya role dengan COMMENT_CREATE).
 */
export function CommentsList({ comments }: { comments: CommentData[] }) {
  if (comments.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <h2 className="mb-2 text-sm font-semibold">Komentar Orang Tua</h2>
      <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
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
            <p className="mt-0.5 text-xs text-slate-400">{formatDateTimeID(comment.createdAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
