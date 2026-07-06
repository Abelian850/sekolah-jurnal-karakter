import { auth, signOut } from "@/lib/auth";

export async function Topbar() {
  const session = await auth();

  return (
    <header className="glass-panel mb-6 flex items-center justify-between rounded-2xl px-6 py-3">
      <div>
        <p className="text-sm font-medium">{session?.user?.email}</p>
        <p className="text-xs capitalize text-slate-500">
          {session?.user?.role?.replace("_", " ")}
        </p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Keluar
        </button>
      </form>
    </header>
  );
}
