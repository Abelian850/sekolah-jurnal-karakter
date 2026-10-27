import Link from "next/link";
import { SchoolLogo } from "@/components/brand-mark";

/** Halaman 404 kustom. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <SchoolLogo size={56} />
      <p className="text-7xl font-extrabold tracking-tighter text-brand-600">404</p>
      <h1 className="text-xl font-bold text-brand-950">Halaman tidak ditemukan</h1>
      <p className="max-w-md text-sm text-slate-600">
        Alamat ini tidak ada atau sudah dipindahkan. Periksa kembali tautannya, atau mulai dari beranda.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/30 transition hover:bg-brand-700"
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
