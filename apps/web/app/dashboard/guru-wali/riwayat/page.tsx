import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID } from "@/lib/date";

interface VerificationHistory {
  id: string;
  journalId: string;
  status: "disetujui" | "ditolak" | "revisi";
  note: string | null;
  characterScore: number | null;
  verifiedAt: string;
  journalDate: string;
  journalStatus: "draft" | "submitted" | "approved" | "rejected";
  studentName: string;
  className: string;
}

const STATUS_BADGE: Record<VerificationHistory["status"], { label: string; className: string }> = {
  disetujui: {
    label: "Disetujui",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  revisi: {
    label: "Revisi",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  ditolak: {
    label: "Ditolak",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

export default async function RiwayatVerifikasiPage() {
  let history: VerificationHistory[] = [];
  let profileMissing = false;
  try {
    history = await apiFetch<VerificationHistory[]>("/verifications/history");
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) {
      profileMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Riwayat Verifikasi</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        100 verifikasi terakhir yang Anda lakukan, terbaru dulu.
      </p>

      {profileMissing ? (
        <p className="text-sm text-slate-500">
          Profil guru untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada jurnal yang Anda verifikasi.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Tanggal Jurnal</th>
              <th className="py-2">Siswa</th>
              <th className="py-2">Hasil</th>
              <th className="py-2">Nilai</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {history.map((v) => {
              const badge = STATUS_BADGE[v.status];
              return (
                <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2">{formatDateID(v.journalDate)}</td>
                  <td className="py-2 font-medium">
                    {v.studentName}
                    <span className="ml-1 text-xs text-slate-500">({v.className})</span>
                  </td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-2">{v.characterScore ?? "-"}</td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard/guru-wali/verifikasi/${v.journalId}`}
                      className="text-xs text-brand-600 hover:underline"
                    >
                      Lihat
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
