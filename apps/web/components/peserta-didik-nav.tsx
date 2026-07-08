"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/peserta-didik/jurnal", label: "Jurnal Hari Ini" },
  { href: "/dashboard/peserta-didik/riwayat", label: "Riwayat Jurnal" },
];

export function PesertaDidikNav() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel mb-6 flex gap-1 rounded-2xl p-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              isActive
                ? "bg-brand-600 text-white"
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
