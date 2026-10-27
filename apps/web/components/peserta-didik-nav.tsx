"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; exact?: boolean }[] = [
  // Beranda dicocokkan persis (bukan startsWith) agar tidak ikut tersorot
  // saat berada di sub-halaman jurnal/riwayat/notifikasi.
  { href: "/dashboard/peserta-didik", label: "Beranda", exact: true },
  { href: "/dashboard/peserta-didik/jurnal", label: "Jurnal Hari Ini" },
  { href: "/dashboard/peserta-didik/riwayat", label: "Riwayat Jurnal" },
  { href: "/dashboard/peserta-didik/notifikasi", label: "Notifikasi" },
];

export function PesertaDidikNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="glass-panel mb-6 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const showBadge = item.label === "Notifikasi" && unreadCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${
              isActive
                ? "bg-brand-600 font-semibold text-white shadow-sm shadow-brand-600/30"
                : "font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700"
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
