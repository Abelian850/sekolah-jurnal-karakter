/**
 * Loading state global (Fase 8) — ditampilkan Next.js saat segmen route
 * sedang dimuat dan segmen tersebut tidak punya loading.tsx sendiri.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span
          aria-hidden
          className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
        />
        Memuat…
      </div>
    </div>
  );
}
