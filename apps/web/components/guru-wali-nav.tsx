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
    <nav className="glass-panel mb-6 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${
              isActive
                ? "bg-brand-600 font-semibold text-white shadow-sm shadow-brand-600/30"
                : "font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
