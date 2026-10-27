import { SchoolLogo } from "@/components/brand-mark";

/**
 * Loading state global — ditampilkan Next.js saat segmen route sedang
 * dimuat dan segmen tersebut tidak punya loading.tsx sendiri.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <span
            aria-hidden
            className="absolute inset-0 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600 border-r-gold-400"
          />
          <SchoolLogo size={40} className="absolute inset-3" />
        </div>
        <p className="text-sm font-medium text-slate-500">Memuat…</p>
      </div>
    </div>
  );
}
