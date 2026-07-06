"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard/admin", label: "Ringkasan" },
  { href: "/dashboard/admin/sekolah", label: "Sekolah" },
  { href: "/dashboard/admin/tahun-ajaran", label: "Tahun Pelajaran" },
  { href: "/dashboard/admin/semester", label: "Semester" },
  { href: "/dashboard/admin/guru", label: "Guru" },
  { href: "/dashboard/admin/siswa", label: "Peserta Didik" },
  { href: "/dashboard/admin/orang-tua", label: "Orang Tua" },
  { href: "/dashboard/admin/penugasan-guru-wali", label: "Penugasan Guru Wali" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="glass-panel flex w-60 shrink-0 flex-col gap-1 rounded-2xl p-4">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Administrator
      </p>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard/admin" ? pathname === item.href : pathname.startsWith(item.href);

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
