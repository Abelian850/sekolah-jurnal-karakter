"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

interface School {
  id: string;
  name: string;
}

/**
 * Dropdown filter sekolah untuk dashboard Ringkasan admin. Mengubah query
 * string ?schoolId= lalu me-refresh Server Component - tanpa state lokal,
 * URL adalah satu-satunya sumber kebenaran filter.
 */
export function SchoolFilter({
  schools,
  selectedId,
}: {
  schools: School[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(() => {
      router.replace(value ? `${pathname}?schoolId=${value}` : pathname);
    });
  }

  return (
    <select
      value={selectedId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      aria-label="Filter sekolah"
      className="rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/80"
    >
      <option value="">Semua Sekolah</option>
      {schools.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
