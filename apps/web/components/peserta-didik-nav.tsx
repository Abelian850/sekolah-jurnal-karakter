"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/peserta-didik/jurnal", label: "Jurnal Hari Ini" },
  { href: "/dashboard/peserta-didik/riwayat", label: "Riwayat Jurnal" },
  { href: "/dashboard/peserta-didik/notifikasi", label: "Notifikasi" },
];

export function PesertaDidikNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="glass-panel mb-6 flex gap-1 rounded-2xl p-2">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const showBadge = item.label === "Notifikasi" && unreadCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition ${
              isActive
                ? "bg-brand-600 font-medium text-white"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {item.label}
            {showBadge && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
