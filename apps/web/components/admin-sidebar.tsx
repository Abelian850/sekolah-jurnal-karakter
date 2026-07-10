"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Sidebar admin — redesign Fase 8: panel biru solid bergaya modern-minimal
 * (logo di atas, label grup, item pill dengan state aktif putih-transparan).
 */
const NAV_ITEMS = [
  { href: "/dashboard/admin", label: "Ringkasan" },
  { href: "/dashboard/admin/sekolah", label: "Sekolah" },
  { href: "/dashboard/admin/tahun-ajaran", label: "Tahun Pelajaran" },
  { href: "/dashboard/admin/semester", label: "Semester" },
  { href: "/dashboard/admin/guru", label: "Guru" },
  { href: "/dashboard/admin/kepala-sekolah", label: "Kepala Sekolah" },
  { href: "/dashboard/admin/siswa", label: "Peserta Didik" },
  { href: "/dashboard/admin/orang-tua", label: "Orang Tua" },
  { href: "/dashboard/admin/penugasan-guru-wali", label: "Penugasan Guru Wali" },
  { href: "/dashboard/admin/jurnal-template", label: "Template Jurnal" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-6 flex max-h-[calc(100vh-3rem)] w-60 shrink-0 flex-col gap-1 self-start overflow-y-auto rounded-2xl bg-brand-600 p-4 text-white shadow-sm dark:bg-brand-900">
      <Link href="/dashboard/admin" className="mb-4 px-2 text-lg font-bold tracking-tight">
        Jurnal Karakter
      </Link>
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
        Menu Utama
      </p>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard/admin" ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm transition ${
              isActive
                ? "bg-white/20 font-semibold text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
