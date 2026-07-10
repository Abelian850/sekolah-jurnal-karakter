import { auth, signOut } from "@/lib/auth";

/**
 * Topbar — redesign Fase 8: sapaan hangat di kiri, chip avatar (inisial)
 * + peran + tombol Keluar di kanan, di atas kartu putih bersih.
 */
export async function Topbar() {
  const session = await auth();
  const email = session?.user?.email ?? "";
  const role = session?.user?.role?.replace("_", " ") ?? "";
  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <header className="glass-panel mb-6 flex items-center justify-between gap-4 rounded-2xl px-6 py-3">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">Selamat datang 👋</p>
        <p className="truncate text-sm font-semibold">{email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200"
          >
            {initial}
          </span>
          <span className="hidden text-xs capitalize text-slate-500 sm:block">{role}</span>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-900 dark:hover:bg-red-950">
            Keluar
          </button>
        </form>
      </div>
    </header>
  );
}
