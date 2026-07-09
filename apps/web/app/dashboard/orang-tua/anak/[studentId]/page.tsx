import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { formatDateID } from "@/lib/date";

interface Child {
  id: string;
  fullName: string;
  className: string;
}

interface ChildJournal {
  id: string;
  journalDate: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt: string | null;
  verificationStatus: "disetujui" | "ditolak" | "revisi" | null;
  characterScore: number | null;
  verificationNote: string | null;
}

const STATUS_BADGE: Record<ChildJournal["status"], { label: string; className: string }> = {
  draft: {
    label: "Draf",
    className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  },
  submitted: {
    label: "Terkirim",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  approved: {
    label: "Disetujui",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

export default async function AnakDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;

  // Nama anak diambil dari daftar anak sendiri (bukan endpoint siswa umum)
  // agar tetap tunduk pada relasi student_parent di server.
  const children = await apiFetch<Child[]>("/children");
  const child = children.find((c) => c.id === studentId);
  const journals = await apiFetch<ChildJournal[]>(`/children/${studentId}/journals`);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-4">
        <Link
          href="/dashboard/orang-tua"
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          &larr; Kembali ke daftar anak
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          Riwayat Jurnal {child ? `— ${child.fullName}` : ""}
        </h1>
        {child && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelas {child.className}</p>
        )}
      </div>

      {journals.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada jurnal untuk anak ini.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Tanggal</th>
              <th className="py-2">Status</th>
              <th className="py-2">Nilai</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {journals.map((j) => {
              const badge = STATUS_BADGE[j.status];
              return (
                <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2">{formatDateID(j.journalDate)}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2 tabular-nums">{j.characterScore ?? "-"}</td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard/orang-tua/jurnal/${j.id}`}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Lihat detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
