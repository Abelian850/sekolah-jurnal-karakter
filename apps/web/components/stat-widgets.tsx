/**
 * Widget kecil untuk halaman dashboard: kartu angka ringkasan dan bar
 * horizontal distribusi. Pola visual sama dengan dashboard Kepala Sekolah
 * (apps/web/app/dashboard/kepala-sekolah/page.tsx) agar konsisten antar peran.
 */

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-4">
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-600 via-brand-400 to-gold-400" />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-brand-950">{value}</p>
    </div>
  );
}

export function Bar({
  label,
  value,
  total,
  colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 text-xs text-slate-600 dark:text-slate-400">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-slate-600 dark:text-slate-400">
        {value} ({pct}%)
      </span>
    </div>
  );
}
