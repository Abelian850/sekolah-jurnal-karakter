import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/topbar";
import { ChangePasswordForm } from "@/components/change-password-form";

/**
 * Halaman profil — ganti kata sandi mandiri (Fase 9). Berada DI LUAR
 * layout per-role karena bisa diakses SEMUA peran; cukup cek session
 * (middleware.ts + cek di sini sebagai lapisan kedua).
 */
export default async function ProfilPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-4 sm:p-6">
      <Topbar />
      <main className="glass-panel rounded-2xl p-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-600 hover:underline"
        >
          &larr; Kembali ke dashboard
        </Link>
        <h1 className="mb-1 text-xl font-bold">Ganti Kata Sandi</h1>
        <p className="mb-6 text-sm text-slate-500">
          Kata sandi awal Anda (NIP untuk guru, NISN untuk peserta didik) bukan rahasia.
          Segera ganti dengan kata sandi yang hanya Anda ketahui.
        </p>
        <ChangePasswordForm />
      </main>
    </div>
  );
}
