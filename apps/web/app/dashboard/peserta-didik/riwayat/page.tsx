import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID } from "@/lib/date";

interface Journal {
  id: string;
  journalDate: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  submittedAt: string | null;
}

const STATUS_BADGE: Record<Journal["status"], { label: string; className: string }> = {
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

export default async function RiwayatJurnalPage() {
  let journals: Journal[] = [];
  let profileMissing = false;
  try {
    journals = await apiFetch<Journal[]>("/journals");
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) {
      profileMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Riwayat Jurnal</h1>

      {profileMissing ? (
        <p className="text-sm text-slate-500">
          Profil peserta didik untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      ) : journals.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada jurnal. Mulai dari halaman Jurnal Hari Ini.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Tanggal</th>
              <th className="py-2">Status</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {journals.map((j) => {
              const badge = STATUS_BADGE[j.status];

              return (
                <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 font-medium">{formatDateID(j.journalDate)}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard/peserta-didik/riwayat/${j.id}`}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Lihat Detail
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
