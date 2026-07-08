import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID } from "@/lib/date";

interface PendingJournal {
  id: string;
  journalDate: string;
  status: string;
  submittedAt: string | null;
  studentId: string;
  studentName: string;
  className: string;
}

export default async function GuruWaliPendingPage() {
  let journals: PendingJournal[] = [];
  let profileMissing = false;
  try {
    journals = await apiFetch<PendingJournal[]>("/verifications/pending");
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) {
      profileMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Menunggu Verifikasi</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Jurnal siswa binaan yang sudah dikirim dan menunggu diperiksa, terlama dulu.
      </p>

      {profileMissing ? (
        <p className="text-sm text-slate-500">
          Profil guru untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      ) : journals.length === 0 ? (
        <p className="text-sm text-slate-500">
          Tidak ada jurnal yang menunggu verifikasi. Kerja bagus!
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
              <th className="py-2">Tanggal Jurnal</th>
              <th className="py-2">Siswa</th>
              <th className="py-2">Kelas</th>
              <th className="py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {journals.map((j) => (
              <tr key={j.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2">{formatDateID(j.journalDate)}</td>
                <td className="py-2 font-medium">{j.studentName}</td>
                <td className="py-2">{j.className}</td>
                <td className="py-2">
                  <Link
                    href={`/dashboard/guru-wali/verifikasi/${j.id}`}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
                  >
                    Periksa
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
