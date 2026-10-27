"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

/**
 * Sidebar admin — redesign Fase 8: panel biru solid bergaya modern-minimal
 * (logo di atas, label grup, item pill dengan state aktif putih-transparan).
 *
 * Responsif: di layar < lg sidebar berubah menjadi bar atas dengan tombol
 * hamburger yang membuka daftar menu; menu otomatis menutup saat pindah
 * halaman (efek pada pathname).
 */
const NAV_ITEMS = [
  { href: "/dashboard/admin", label: "Ringkasan" },
  { href: "/dashboard/admin/sekolah", label: "Sekolah" },
  { href: "/dashboard/admin/tahun-ajaran", label: "Tahun Pelajaran" },
  { href: "/dashboard/admin/semester", label: "Semester" },
  { href: "/dashboard/admin/guru", label: "Guru" },
  { href: "/dashboard/admin/kepala-sekolah", label: "Kepala Sekolah" },
  { href: "/dashboard/admin/siswa", label: "Murid" },
  { href: "/dashboard/admin/kelulusan-kenaikan", label: "Kelulusan & Kenaikan" },
  { href: "/dashboard/admin/orang-tua", label: "Orang Tua" },
  { href: "/dashboard/admin/penugasan-guru-wali", label: "Penugasan Guru Wali" },
  { href: "/dashboard/admin/jurnal-template", label: "Template Jurnal" },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard/admin" ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative rounded-xl px-3 py-2 text-sm transition ${
              isActive
                ? "bg-white/[0.12] font-semibold text-white before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-gold-400"
                : "text-brand-100/80 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Tutup menu mobile setiap kali berpindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ---- Mobile: bar atas + menu lipat ---- */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-950 to-brand-800 p-4 text-white shadow-md shadow-brand-950/20 lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/admin">
            <BrandMark tone="light" size={34} subtitle="Panel Admin" />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            className="rounded-lg p-2 hover:bg-white/10"
          >
            {open ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        {open && (
          <nav className="mt-3 flex flex-col gap-1 border-t border-white/15 pt-3">
            <NavLinks pathname={pathname} />
          </nav>
        )}
      </div>

      {/* ---- Desktop: sidebar kiri ---- */}
      <nav className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-64 shrink-0 flex-col gap-0.5 self-start overflow-y-auto rounded-2xl bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 p-4 text-white shadow-lg shadow-brand-950/20 lg:flex">
        <Link href="/dashboard/admin" className="mb-5 rounded-xl px-1 py-1">
          <BrandMark tone="light" size={38} subtitle="Panel Admin" />
        </Link>
        <p className="mb-2 px-3 text-xs font-medium text-brand-300">Menu utama</p>
        <NavLinks pathname={pathname} />
      </nav>
    </>
  );
}
