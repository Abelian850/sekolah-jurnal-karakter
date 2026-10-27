"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { BrandMark, SchoolLogo } from "@/components/brand-mark";

/**
 * Satu halaman login untuk seluruh peran (sesuai keputusan Fase 1: satu login,
 * lalu diarahkan ke dashboard sesuai role yang tersimpan di JWT / session).
 * Pengarahan berdasarkan role dilakukan di app/dashboard/page.tsx.
 *
 * Tata letak: panel identitas sekolah (biru) di kiri pada layar lebar,
 * formulir di kanan. Di ponsel hanya formulir dengan logo di atasnya.
 */
const HABITS = [
  "Bangun pagi",
  "Beribadah",
  "Berolahraga",
  "Makan sehat dan bergizi",
  "Gemar belajar",
  "Bermasyarakat",
  "Tidur cepat",
];

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError("Email/NISN/NIP atau kata sandi salah. Periksa kembali, lalu coba lagi.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel identitas — hanya layar lebar */}
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(44rem_32rem_at_90%_-10%,rgb(58_98_224/0.55),transparent_60%),radial-gradient(30rem_24rem_at_-10%_110%,rgb(245_200_46/0.14),transparent_60%)]"
        />
        <SchoolLogo size={360} className="pointer-events-none absolute -bottom-16 -right-16 opacity-[0.06]" />

        <Link href="/" className="relative w-fit">
          <BrandMark tone="light" size={44} />
        </Link>

        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Kebiasaan baik,
            <br />
            tercatat setiap hari.
          </h1>
          <p className="mt-4 text-brand-100">
            Visi SMP Negeri 30 Semarang: “Terwujudnya Murid yang Berprestasi,
            Berkarakter, serta Peduli Lingkungan.”
          </p>
          <ol className="mt-10 grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-brand-100">
            {HABITS.map((h, i) => (
              <li key={h} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-gold-300 ring-1 ring-white/15">
                  {i + 1}
                </span>
                {h}
              </li>
            ))}
          </ol>
        </div>
      </aside>

      {/* Formulir */}
      <section className="flex flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/">
              <BrandMark size={44} />
            </Link>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-brand-950">Masuk ke jurnal</h2>
          <p className="mt-1.5 text-sm text-slate-500">Gunakan akun yang diberikan Admin sekolah.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-id" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email, NISN, atau NIP
              </label>
              <input
                id="login-id"
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="NISN / NIP / nama@sekolah.sch.id"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Kata sandi
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-20`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  className="absolute inset-y-1 right-1 rounded-lg px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  {showPassword ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">
              <strong className="font-semibold">Murid:</strong> NISN sebagai username dan kata sandi awal.
              <br />
              <strong className="font-semibold">Guru:</strong> NIP sebagai username dan kata sandi awal.
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            <Link href="/" className="font-medium text-brand-700 hover:underline">
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
