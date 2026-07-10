import Link from "next/link";

/**
 * Landing page publik (Fase 8). Server component murni — tanpa dependensi
 * baru, tanpa JS klien; FAQ memakai <details> native. Styling konsisten
 * dengan dashboard: Tailwind + utility .glass-panel + warna brand.
 */

const ROLES = [
  {
    title: "Peserta Didik",
    desc: "Mengisi jurnal 7 Kebiasaan setiap hari, melampirkan foto bukti, memantau status verifikasi dan nilai, serta menerima notifikasi komentar.",
    icon: "📝",
  },
  {
    title: "Guru Wali",
    desc: "Membina siswa lintas kelas dan angkatan: menetapkan kebiasaan berbukti harian, memverifikasi jurnal (setujui/revisi/tolak), dan memberi nilai 1–100.",
    icon: "✅",
  },
  {
    title: "Kepala Sekolah",
    desc: "Memantau analitik sekolah: ringkasan harian, tingkat verifikasi 30 hari, tren pengisian 7 hari, dan rata-rata nilai per kelas.",
    icon: "📊",
  },
  {
    title: "Orang Tua",
    desc: "Melihat riwayat dan detail jurnal anak, lalu berkomentar langsung — siswa dan guru wali otomatis menerima notifikasi.",
    icon: "💬",
  },
  {
    title: "Admin Sekolah",
    desc: "Mengelola sekolah, tahun pelajaran, semester, akun seluruh peran, penugasan guru wali, template jurnal, serta bulk import/export Excel.",
    icon: "🛠️",
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

export default function LandingPage() {
  return (
    <div className="scroll-smooth">
      {/* Header */}
      <header className="glass-panel sticky top-0 z-10 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold tracking-tight">
            Jurnal Karakter
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
              className="rounded-full bg-brand-600 px-4 py-1.5 font-medium text-white transition hover:bg-brand-500"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-900/20"
          />
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 text-center">
            <p className="mx-auto mb-6 w-fit rounded-full border border-brand-500/30 bg-brand-50 px-4 py-1 text-xs font-medium text-brand-600 dark:bg-brand-900/30">
              Mendukung Gerakan 7 Kebiasaan Anak Indonesia Hebat
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Jurnal Karakter &amp; Monitoring Peserta Didik
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
              Satu platform bagi sekolah untuk menumbuhkan kebiasaan baik:
              siswa mencatat, guru wali membina dan menilai, orang tua
              mendampingi, kepala sekolah memantau.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-brand-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-500 hover:shadow-md"
              >
                Masuk ke Sistem
              </Link>
              <a
                href="#fitur"
                className="glass-panel rounded-full px-6 py-3 text-sm font-medium transition hover:shadow-md"
              >
                Lihat Fitur
              </a>
            </div>
          </div>
        </section>

        {/* 7 Kebiasaan */}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="glass-panel rounded-2xl p-6 sm:p-8">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-brand-600">
              7 Kebiasaan Anak Indonesia Hebat
            </h2>
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {HABITS.map((h, i) => (
                <li
                  key={h}
                  className="rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900/70"
                >
                  <span className="mr-1.5 font-semibold text-brand-600">{i + 1}.</span>
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
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.title} className="glass-panel rounded-2xl p-6">
                <div className="text-2xl" aria-hidden>
                  {r.icon}
                </div>
                <h3 className="mt-3 font-semibold">{r.title}</h3>
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
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="glass-panel rounded-2xl p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
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
              <details key={f.q} className="glass-panel group rounded-2xl px-6 py-4">
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
          <div className="glass-panel rounded-3xl p-10 text-center sm:p-14">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Siap menumbuhkan kebiasaan baik di sekolah Anda?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Masuk dengan akun yang diberikan Admin sekolah. Peserta didik
              cukup memakai NISN.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-block rounded-full bg-brand-600 px-8 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-500 hover:shadow-md"
            >
              Masuk ke Sistem
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs text-slate-500 sm:flex-row">
          <span>Jurnal Karakter &amp; Monitoring Peserta Didik</span>
          <span>
            Dibangun dengan Next.js · Hono · Neon — di Cloudflare Workers
          </span>
        </div>
      </footer>
    </div>
  );
}
