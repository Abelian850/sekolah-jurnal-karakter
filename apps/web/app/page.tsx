import Image from "next/image";
import Link from "next/link";

/**
 * Landing page publik. Server component murni — tanpa dependensi baru,
 * tanpa JS klien; FAQ memakai <details> native. Gaya: modern biru
 * profesional (hero berfoto latar penuh + overlay gradasi biru gelap,
 * kartu berbayang, ikon berlatar warna), konsisten dengan warna brand +
 * utility .glass-panel dashboard.
 *
 * Aset di apps/web/public/ (saat ini PLACEHOLDER — timpa dengan aset asli
 * tanpa mengubah kode, nama file harus sama):
 * - /logo.png  : logo sekolah (persegi, disarankan >= 256x256)
 * - /hero.webp : foto latar hero (disarankan 1600x900, < 300KB)
 */

const ROLES = [
  {
    title: "Peserta Didik",
    desc: "Mengisi jurnal 7 Kebiasaan setiap hari, melampirkan foto bukti, memantau status verifikasi dan nilai, serta menerima notifikasi komentar.",
    icon: "📝",
    accent: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:ring-blue-900",
  },
  {
    title: "Guru Wali",
    desc: "Membina siswa lintas kelas dan angkatan: menetapkan kebiasaan berbukti harian, memverifikasi jurnal (setujui/revisi/tolak), dan memberi nilai 1–100.",
    icon: "✅",
    accent: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900",
  },
  {
    title: "Kepala Sekolah",
    desc: "Memantau analitik sekolah: ringkasan harian, tingkat verifikasi 30 hari, tren pengisian 7 hari, dan rata-rata nilai per kelas.",
    icon: "📊",
    accent: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:ring-violet-900",
  },
  {
    title: "Orang Tua",
    desc: "Melihat riwayat dan detail jurnal anak, lalu berkomentar langsung — siswa dan guru wali otomatis menerima notifikasi.",
    icon: "💬",
    accent: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900",
  },
  {
    title: "Admin Sekolah",
    desc: "Mengelola sekolah, tahun pelajaran, semester, akun seluruh peran, penugasan guru wali, template jurnal, serta bulk import/export Excel.",
    icon: "🛠️",
    accent: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-900",
  },
] as const;

const HABITS = [
  "Bangun pagi",
  "Beribadah",
  "Berolahraga",
  "Makan sehat dan bergizi",
  "Gemar belajar",
  "Bermasyarakat",
  "Tidur cepat",
] as const;

const STEPS = [
  {
    title: "Siswa mengisi jurnal",
    desc: "Setiap hari siswa mencatat ketujuh kebiasaan — status “Belum” wajib berketerangan — dan melampirkan satu foto bukti.",
  },
  {
    title: "Guru wali memverifikasi",
    desc: "Guru wali memeriksa jurnal siswa binaannya, menyetujui / meminta revisi / menolak, lalu memberi nilai karakter.",
  },
  {
    title: "Orang tua mendampingi",
    desc: "Orang tua membaca jurnal anak dan meninggalkan komentar; notifikasi terkirim otomatis ke siswa dan guru wali.",
  },
  {
    title: "Kepala sekolah memantau",
    desc: "Dashboard analitik menyajikan capaian pengisian, verifikasi, dan nilai per kelas untuk pengambilan keputusan.",
  },
] as const;

const FAQS = [
  {
    q: "Apa bedanya Guru Wali dengan Wali Kelas?",
    a: "Guru Wali membina peserta didik secara personal lintas kelas dan angkatan. Penugasannya dapat berubah kapan saja tanpa mengubah data siswa — berbeda dengan Wali Kelas yang terikat pada satu kelas.",
  },
  {
    q: "Bagaimana peserta didik masuk ke sistem?",
    a: "Peserta didik masuk memakai NISN sebagai username sekaligus kata sandi awal, lalu disarankan mengganti kata sandi. Peran lain masuk dengan email yang didaftarkan Admin.",
  },
  {
    q: "Apakah foto bukti wajib setiap hari?",
    a: "Ya, minimal satu foto per hari. Guru wali dapat menetapkan kebiasaan tertentu yang wajib berfoto pada tanggal tertentu; jika tidak ditetapkan, siswa bebas memilih kebiasaan mana pun untuk difoto.",
  },
  {
    q: "Apakah data antar sekolah terpisah?",
    a: "Ya. Setiap pengguna terikat pada satu sekolah dan seluruh akses API dibatasi berdasarkan sekolah yang tercatat di token masuk (JWT), bukan dari input pengguna.",
  },
] as const;

/** Logo sekolah dari /public/logo.png (placeholder sampai diganti user). */
function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Logo sekolah"
      width={size}
      height={size}
      className={`rounded-xl shadow-sm ${className}`}
      priority
    />
  );
}

export default function LandingPage() {
  return (
    <div className="scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-sm font-semibold tracking-tight">SMP Negeri 30 Semarang</span>
          </span>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#fitur" className="hidden text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 sm:inline">
              Fitur
            </a>
            <a href="#alur" className="hidden text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 sm:inline">
              Alur
            </a>
            <a href="#faq" className="hidden text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 sm:inline">
              FAQ
            </a>
            <Link
              href="/login"
              className="rounded-full bg-brand-600 px-4 py-1.5 font-medium text-white shadow-sm transition hover:bg-brand-500 hover:shadow"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero — foto latar penuh + overlay gradasi biru gelap */}
        <section className="relative isolate overflow-hidden">
          <Image
            src="/hero.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
            aria-hidden
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/85 via-brand-900/75 to-slate-950/90"
          />
          <div className="mx-auto max-w-6xl px-6 pb-24 pt-28 text-center">
            <LogoMark size={72} className="mx-auto mb-6 ring-2 ring-white/30" />
            <p className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-medium text-brand-100 shadow-sm backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-200" />
              Mendukung Gerakan 7 Kebiasaan Anak Indonesia Hebat
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Jurnal Karakter &amp;{" "}
              <span className="bg-gradient-to-r from-brand-200 to-brand-500 bg-clip-text text-transparent">
                Monitoring Peserta Didik
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-200 sm:text-lg">
              Satu platform bagi sekolah untuk menumbuhkan kebiasaan baik:
              siswa mencatat, guru wali membina dan menilai, orang tua
              mendampingi, kepala sekolah memantau.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-600/30"
              >
                Isi Jurnal
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-medium text-white shadow-sm backdrop-blur transition hover:bg-white/20 hover:shadow-md"
              >
                Wali Kelas
              </Link>
            </div>
          </div>
        </section>

        {/* 7 Kebiasaan */}
        <section className="mx-auto -mt-4 max-w-6xl px-6 pb-16">
          <div className="glass-panel rounded-2xl p-6 shadow-md sm:p-8">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-brand-600">
              7 Kebiasaan Anak Indonesia Hebat
            </h2>
            <ul className="mt-5 flex flex-wrap justify-center gap-2.5">
              {HABITS.map((h, i) => (
                <li
                  key={h}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Fitur per peran */}
        <section id="fitur" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Satu aplikasi, lima peran
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 dark:text-slate-400">
            Berbasis relasi Guru Wali ↔ Peserta Didik — guru wali dapat membina
            siswa lintas kelas dan angkatan tanpa mengubah data siswa.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div
                key={r.title}
                className="glass-panel group rounded-2xl p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ring-1 ${r.accent}`}
                  aria-hidden
                >
                  {r.icon}
                </div>
                <h3 className="mt-4 font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Alur kerja */}
        <section id="alur" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Bagaimana alurnya?
          </h2>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="glass-panel relative rounded-2xl p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white shadow-sm">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 pb-20">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Pertanyaan umum
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="glass-panel group rounded-2xl px-6 py-4 transition hover:shadow-md">
                <summary className="cursor-pointer list-none text-sm font-medium [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block text-brand-600 transition group-open:rotate-90">
                    ▸
                  </span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA akhir */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-center shadow-xl sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_80%,white,transparent_40%)]"
            />
            <h2 className="relative text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Siap menumbuhkan kebiasaan baik di sekolah Anda?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-brand-100">
              Masuk dengan akun yang diberikan Admin sekolah. Peserta didik
              cukup memakai NISN.
            </p>
            <Link
              href="/login"
              className="relative mt-7 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow-md transition hover:shadow-lg"
            >
              Masuk ke Sistem
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-slate-500 sm:flex-row">
          <span className="flex items-center gap-2">
            <LogoMark className="h-6 w-6 rounded-lg text-[11px]" />
            Jurnal Karakter &amp; Monitoring Peserta Didik
          </span>
          <span>
            Dibangun dengan Next.js · Hono · Neon — di Cloudflare Workers
          </span>
        </div>
      </footer>
    </div>
  );
}
