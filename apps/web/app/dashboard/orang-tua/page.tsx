import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

interface Child {
  id: string;
  fullName: string;
  nis: string;
  nisn: string | null;
  className: string;
  gradeLevel: string;
  photoUrl: string | null;
  isActive: boolean;
}

export default async function OrangTuaHomePage() {
  let childList: Child[] = [];
  let profileMissing = false;
  try {
    childList = await apiFetch<Child[]>("/children");
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) {
      profileMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Anak Saya</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Pilih anak untuk melihat jurnal karakter hariannya beserta hasil
        penilaian Guru Wali.
      </p>

      {profileMissing ? (
        <p className="text-sm text-slate-500">
          Profil orang tua untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      ) : childList.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada anak yang tertaut ke akun ini. Hubungi Admin sekolah.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {childList.map((child) => (
            <li key={child.id}>
              <Link
                href={`/dashboard/orang-tua/anak/${child.id}`}
                className="block rounded-xl border border-slate-200 p-4 transition hover:border-brand-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              >
                <p className="font-medium">{child.fullName}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Kelas {child.className} · NIS {child.nis}
                </p>
                {!child.isActive && (
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800">
                    Nonaktif
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
