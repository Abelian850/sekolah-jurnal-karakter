"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  // Halaman verifikasi detail (/verifikasi/[id]) dianggap bagian dari
  // "Beranda" agar tab tetap tersorot saat guru memeriksa jurnal (daftar
  // menunggu verifikasi kini menjadi bagian dari dashboard Beranda).
  {
    href: "/dashboard/guru-wali",
    label: "Beranda",
    match: (p: string) => p === "/dashboard/guru-wali" || p.startsWith("/dashboard/guru-wali/verifikasi"),
  },
  {
    href: "/dashboard/guru-wali/riwayat",
    label: "Riwayat Verifikasi",
    match: (p: string) => p.startsWith("/dashboard/guru-wali/riwayat"),
  },
  {
    href: "/dashboard/guru-wali/bukti-harian",
    label: "Bukti Harian",
    match: (p: string) => p.startsWith("/dashboard/guru-wali/bukti-harian"),
  },
  {
    href: "/dashboard/guru-wali/template",
    label: "Template Jurnal",
    match: (p: string) => p.startsWith("/dashboard/guru-wali/template"),
  },
];

export function GuruWaliNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel mb-6 flex gap-1 rounded-2xl p-2">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm transition ${
              isActive
                ? "bg-brand-600 font-medium text-white"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
