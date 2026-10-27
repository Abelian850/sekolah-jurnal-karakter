import Image from "next/image";

/**
 * Identitas aplikasi: logo sekolah (/public/logo.png) + nama aplikasi.
 * Dipakai di landing page, login, topbar, dan sidebar admin agar
 * identitasnya sama di semua halaman.
 */
export function SchoolLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Logo SMP Negeri 30 Semarang"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      priority
    />
  );
}

export function BrandMark({
  tone = "dark",
  size = 36,
  subtitle = "SMP Negeri 30 Semarang",
}: {
  /** "dark" = teks gelap (di latar terang), "light" = teks putih (di latar biru). */
  tone?: "dark" | "light";
  size?: number;
  subtitle?: string | null;
}) {
  const title = tone === "light" ? "text-white" : "text-brand-950";
  const sub = tone === "light" ? "text-brand-200" : "text-slate-500";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <SchoolLogo size={size} />
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-[15px] font-extrabold tracking-tight ${title}`}>
          Jurnal 7 KAIH
        </span>
        {subtitle && <span className={`block truncate text-xs font-medium ${sub}`}>{subtitle}</span>}
      </span>
    </span>
  );
}
