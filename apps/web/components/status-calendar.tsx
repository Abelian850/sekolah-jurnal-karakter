import Link from "next/link";

/**
 * Kalender bulanan bergaya dashboard (terinspirasi tampilan Pijar Sekolah):
 * grid Senin-Minggu, tanggal hari ini diberi cincin, dan tanggal tertentu
 * bisa diberi warna status lewat prop `marks` (kunci = YYYY-MM-DD).
 *
 * Server Component murni - navigasi bulan memakai Link dengan query string
 * (?bulan=YYYY-MM) sehingga tidak butuh state di klien. Legenda dirender
 * oleh halaman pemakai lewat `children` karena arti warna berbeda per peran
 * (guru wali vs peserta didik).
 */

export interface CalendarMark {
  /** Kelas Tailwind untuk sel tanggal, mis. "bg-green-100 text-green-700". */
  colorClass: string;
  /** Tooltip saat kursor diarahkan ke tanggal. */
  title?: string;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function StatusCalendar({
  month,
  today,
  marks,
  basePath,
  children,
}: {
  /** Bulan yang ditampilkan, format YYYY-MM. */
  month: string;
  /** Tanggal hari ini (WIB), format YYYY-MM-DD. */
  today: string;
  marks: Record<string, CalendarMark>;
  /** Path halaman untuk navigasi bulan, mis. "/dashboard/guru-wali". */
  basePath: string;
  /** Legenda warna (opsional), dirender di bawah grid. */
  children?: React.ReactNode;
}) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // getUTCDay(): 0=Minggu ... 6=Sabtu -> geser agar 0=Senin (pola Pijar).
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const cells: (number | null)[] = [
    ...(Array(firstWeekday).fill(null) as null[]),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const navClass =
    "flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-500 " +
    "hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={`${basePath}?bulan=${shiftMonth(month, -1)}`}
          aria-label="Bulan sebelumnya"
          className={navClass}
        >
          &lsaquo;
        </Link>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <Link
          href={`${basePath}?bulan=${shiftMonth(month, 1)}`}
          aria-label="Bulan berikutnya"
          className={navClass}
        >
          &rsaquo;
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const dateStr = `${month}-${String(day).padStart(2, "0")}`;
          const mark = marks[dateStr];
          const isToday = dateStr === today;
          return (
            <div key={dateStr} className="flex justify-center">
              <div
                title={mark?.title}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums ${
                  mark?.colorClass ?? ""
                } ${isToday ? "font-semibold ring-2 ring-brand-600" : ""}`}
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>

      {children}
    </div>
  );
}

/** Satu butir legenda warna kalender. */
export function CalendarLegend({ items }: { items: { colorClass: string; label: string }[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span className={`h-3 w-3 rounded-full ${item.colorClass}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
