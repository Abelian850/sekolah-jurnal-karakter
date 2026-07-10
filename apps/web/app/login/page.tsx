"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

/**
 * Satu halaman login untuk seluruh peran (sesuai keputusan Fase 1: satu login,
 * lalu diarahkan ke dashboard sesuai role yang tersimpan di JWT / session).
 * Pengarahan berdasarkan role dilakukan di app/dashboard/page.tsx.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email/NISN atau kata sandi salah.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-900/20"
      />
      <p className="mb-6 text-center text-sm font-semibold tracking-tight">
        Jurnal Karakter &amp; Monitoring Peserta Didik
      </p>
      <form
        onSubmit={handleSubmit}
        className="glass-panel w-full max-w-sm rounded-2xl p-8 shadow-sm"
      >
        <h1 className="mb-6 text-center text-xl font-semibold">Masuk</h1>

        <label className="mb-1 block text-sm font-medium">Email atau NISN</label>
        <input
          type="text"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          placeholder="nama@sekolah.sch.id / NISN"
        />
        <p className="-mt-3 mb-3 text-xs text-slate-500">
          Peserta didik: masukkan NISN sebagai username dan kata sandi.
        </p>

        <label className="mb-1 block text-sm font-medium">Kata Sandi</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
          placeholder="••••••••"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>

        <p className="mt-5 text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-600 hover:underline">
            &larr; Kembali ke beranda
          </Link>
        </p>
      </form>
    </main>
  );
}
