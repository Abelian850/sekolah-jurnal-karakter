import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID, getTodayDateWIB } from "@/lib/date";

interface StudentProfile {
  id: string;
  fullName: string;
  className: string;
  nis: string;
}

export default async function PesertaDidikHomePage() {
  let student: StudentProfile | null = null;
  try {
    student = await apiFetch<StudentProfile>("/students/me");
  } catch (err) {
    if (!(err instanceof ApiRequestError) || err.statusCode !== 404) throw err;
  }

  if (!student) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Dashboard Peserta Didik</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Profil peserta didik untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Halo, {student.fullName}</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Kelas {student.className} &middot; {formatDateID(getTodayDateWIB())}
      </p>

      <div className="flex gap-2">
        <Link
          href="/dashboard/peserta-didik/jurnal"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Isi Jurnal Hari Ini
        </Link>
        <Link
          href="/dashboard/peserta-didik/riwayat"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Lihat Riwayat
        </Link>
      </div>
    </div>
  );
}
