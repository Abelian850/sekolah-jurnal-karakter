import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { SchoolLogo } from "@/components/brand-mark";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin Sekolah",
  kepala_sekolah: "Kepala Sekolah",
  guru: "Guru",
  guru_wali: "Guru Wali",
  peserta_didik: "Murid",
  orang_tua: "Orang Tua",
};

/**
 * Topbar dashboard: logo + sapaan di kiri, chip peran + Ubah Sandi +
 * Keluar di kanan.
 */
export async function Topbar() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  // Nama diisi saat login dari tabel profil (teachers/students/principals).
  // Fallback ke email untuk admin (tanpa profil) atau sesi lama yang
  // JWT-nya belum memuat name (perlu login ulang agar terisi).
  const displayName = session?.user?.name || email;
  const rawRole = session?.user?.role ?? "";
  const role = ROLE_LABEL[rawRole] ?? rawRole.replace("_", " ");
  const initial = (displayName[0] ?? "?").toUpperCase();

  return (
    <header className="glass-panel relative mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 overflow-hidden rounded-2xl px-4 py-3 sm:px-5">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-gold-400 to-brand-600" />
      <div className="flex min-w-0 items-center gap-3">
        <SchoolLogo size={36} className="hidden sm:block" />
        <div className="min-w-0">
          <p className="text-xs text-slate-500">Selamat datang,</p>
          <p className="truncate text-sm font-bold text-brand-950">{displayName}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full bg-brand-50 py-1 pl-1 pr-3 text-xs font-semibold text-brand-700 sm:flex">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white"
          >
            {initial}
          </span>
          {role}
        </span>
        <Link
          href="/dashboard/profil"
          className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
        >
          Ubah Sandi
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
            Keluar
          </button>
        </form>
      </div>
    </header>
  );
}
