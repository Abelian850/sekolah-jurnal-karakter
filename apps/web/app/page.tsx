import Link from "next/link";
import { BrandMark, SchoolLogo } from "@/components/brand-mark";
import {
  IconBadgeCheck,
  IconCamera,
  IconChart,
  IconChat,
  IconCheck,
  IconChevron,
  IconMoon,
  IconPencil,
  IconSliders,
  IconSun,
} from "@/components/landing-icons";

/**
 * Landing page publik. Server component murni — tanpa JS klien; FAQ
 * memakai <details> native.
 *
 * Identitas visual: biru logo SMP Negeri 30 Semarang + emas bingkai logo,
 * huruf Plus Jakarta Sans. Elemen khasnya adalah "halaman jurnal" di hero
 * (contoh isi jurnal harian murid) dan lintasan 7 kebiasaan dari bangun
 * pagi sampai tidur cepat.
 */

const HABITS = [
  { name: "Bangun pagi", when: "Fajar", desc: "Memulai hari lebih awal dan teratur." },
  { name: "Beribadah", when: "Fajar", desc: "Menjalankan ibadah sesuai agama dan kepercayaan." },
  { name: "Berolahraga", when: "Pagi", desc: "Bergerak aktif untuk menjaga kebugaran." },
  { name: "Makan sehat dan bergizi", when: "Pagi", desc: "Sarapan dan makan dengan gizi seimbang." },
  { name: "Gemar belajar", when: "Siang", desc: "Belajar dan membaca setiap hari." },
  { name: "Bermasyarakat", when: "Sore", desc: "Peduli dan terlibat di lingkungan sekitar." },
  { name: "Tidur cepat", when: "Malam", desc: "Istirahat cukup untuk hari esok." },
] as const;

/** Contoh isi jurnal untuk kartu di hero (ilustrasi, bukan data murid). */
const SAMPLE_ENTRIES = [
  { time: "04.30", habit: "Bangun pagi", done: true },
  { time: "04.45", habit: "Beribadah", done: true },
  { time: "06.00", habit: "Berolahraga", done: false, note: "Hujan, diganti peregangan di rumah" },
  { time: "06.20", habit: "Makan sehat dan bergizi", done: true, photo: true },
  { time: "14.00", habit: "Gemar belajar", done: true },
  { time: "16.30", habit: "Bermasyarakat", done: true },
  { time: "21.00", habit: "Tidur cepat", done: true },
] as const;

const ROLES = [
  {
    title: "Murid",
    desc: "Mengisi jurnal 7 kebiasaan setiap hari, melampirkan foto bukti, memantau status verifikasi dan nilai, serta menerima notifikasi komentar.",
    Icon: IconPencil,
  },
  {
    title: "Guru Wali",
    desc: "Membina murid lintas kelas dan angkatan: menetapkan kebiasaan yang wajib berfoto, lalu menyetujui, meminta revisi, atau menolak jurnal. Nilai terhitung otomatis.",
    Icon: IconBadgeCheck,
  },
  {
    title: "Kepala Sekolah",
    desc: "Memantau ringkasan harian, tingkat verifikasi 30 hari, tren pengisian 7 hari, dan rata-rata nilai per kelas.",
    Icon: IconChart,
  },
  {
    title: "Orang Tua",
    desc: "Membaca riwayat jurnal anak dan berkomentar langsung. Murid dan guru wali otomatis menerima notifikasi.",
    Icon: IconChat,
  },
  {
    title: "Admin Sekolah",
    desc: "Mengelola tahun pelajaran, semester, akun semua peran, penugasan guru wali, template jurnal, serta impor dan ekspor Excel.",
    Icon: IconSliders,
  },
] as const;

const STEPS = [
  {
    title: "Murid mengisi jurnal",
    desc: "Ketujuh kebiasaan dicatat setiap hari. Status “Belum” wajib diberi keterangan, dan satu foto bukti dilampirkan.",
  },
  {
    title: "Guru wali memverifikasi",
    desc: "Jurnal murid binaan diperiksa: disetujui, diminta revisi, atau ditolak. Nilai karakter terhitung otomatis.",
  },
  {
    title: "Orang tua mendampingi",
    desc: "Orang tua membaca jurnal anak dan memberi komentar. Murid dan guru wali langsung mendapat notifikasi.",
  },
  {
    title: "Kepala sekolah memantau",
    desc: "Capaian pengisian, verifikasi, dan nilai per kelas tersaji di dashboard untuk bahan pembinaan.",
  },
] as const;

const FAQS = [
  {
    q: "Apa itu Guru Wali?",
    a: "Guru Wali membina murid secara personal lintas kelas dan angkatan. Penugasannya dapat berubah kapan saja tanpa mengubah data murid, dan tidak terikat pada satu kelas.",
  },
  {
    q: "Bagaimana murid masuk ke sistem?",
    a: "Murid masuk memakai NISN sebagai username sekaligus kata sandi awal, lalu disarankan mengganti kata sandi. Guru memakai NIP; peran lain memakai email yang didaftarkan Admin.",
  },
  {
    q: "Apakah foto bukti wajib setiap hari?",
    a: "Ya, minimal satu foto per hari. Guru wali dapat menetapkan kebiasaan tertentu yang wajib berfoto pada tanggal tertentu; jika tidak ditetapkan, murid bebas memilih kebiasaan mana pun untuk difoto.",
  },
  {
    q: "Apakah data antar sekolah terpisah?",
    a: "Ya. Setiap pengguna terikat pada satu sekolah, dan seluruh akses data dibatasi berdasarkan sekolah yang tercatat di akun masuk, bukan dari isian pengguna.",
  },
] as const;

function JournalPage() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-md lg:mx-0">
      {/* Halaman di belakang, memberi kesan buku */}
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-[1.75rem] bg-brand-200/20 ring-1 ring-white/10"
      />
      <figure
        aria-label="Contoh halaman jurnal harian murid"
        className="relative overflow-hidden rounded-[1.75rem] bg-white text-slate-800 shadow-2xl shadow-brand-950/50 lg:-rotate-1"
      >
        {/* Pita pembatas buku warna emas */}
        <span aria-hidden className="absolute right-8 top-0 h-14 w-6 bg-gold-400 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />

        <div className="border-b border-slate-100 px-6 pb-4 pt-5">
          <p className="text-xs font-medium text-slate-400">Contoh tampilan</p>
          <p className="mt-0.5 text-lg font-extrabold tracking-tight text-brand-950">Jurnal hari ini</p>
          <p className="text-xs text-slate-500">Senin pagi sampai malam</p>
        </div>

        <ul className="divide-y divide-dashed divide-slate-200 px-6 py-1">
          {SAMPLE_ENTRIES.map((e) => (
            <li key={e.habit} className="flex min-h-[46px] items-center gap-3 py-2">
              <span className="w-11 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{e.time}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">{e.habit}</span>
                {"note" in e && e.note && (
                  <span className="block truncate text-xs text-amber-700">{e.note}</span>
                )}
              </span>
              {"photo" in e && e.photo && (
                <span
                  className="flex h-7 items-center gap-1 rounded-lg bg-brand-50 px-2 text-[11px] font-semibold text-brand-700"
                  title="Foto bukti terlampir"
                >
                  <IconCamera className="h-3.5 w-3.5" />
                  Foto
                </span>
              )}
              {e.done ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white" title="Sudah">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="flex h-6 shrink-0 items-center rounded-full bg-amber-100 px-2 text-[11px] font-semibold text-amber-800">
                  Belum
                </span>
              )}
            </li>
          ))}
        </ul>

        <figcaption className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <IconBadgeCheck className="h-5 w-5" />
            Disetujui guru wali
          </span>
          <span className="rounded-xl bg-brand-950 px-3 py-1.5 text-sm font-extrabold tabular-nums text-gold-300">
            Nilai 92
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link href="/" aria-label="Beranda Jurnal 7 KAIH">
            <BrandMark tone="light" size={38} />
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <a href="#kebiasaan" className="hidden rounded-lg px-3 py-2 text-brand-100 transition hover:text-white md:inline">
              7 Kebiasaan
            </a>
            <a href="#peran" className="hidden rounded-lg px-3 py-2 text-brand-100 transition hover:text-white md:inline">
              Peran
            </a>
            <a href="#alur" className="hidden rounded-lg px-3 py-2 text-brand-100 transition hover:text-white md:inline">
              Alur
            </a>
            <a href="#faq" className="hidden rounded-lg px-3 py-2 text-brand-100 transition hover:text-white md:inline">
              FAQ
            </a>
            <Link
              href="/login"
              className="ml-1 rounded-full bg-gold-400 px-5 py-2 text-sm font-bold text-brand-950 transition hover:bg-gold-300"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate -mt-px overflow-hidden bg-brand-950 text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(60rem_40rem_at_85%_-10%,rgb(58_98_224/0.55),transparent_60%),radial-gradient(40rem_30rem_at_-10%_110%,rgb(245_200_46/0.16),transparent_60%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pb-28 lg:pt-20">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-4 text-xs font-medium text-brand-100">
                <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-bold text-brand-950">7 KAIH</span>
                Gerakan 7 Kebiasaan Anak Indonesia Hebat
              </p>
              <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Kebiasaan baik,
                <br />
                tercatat setiap hari.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
                Jurnal harian murid SMP Negeri 30 Semarang. Murid mencatat tujuh
                kebiasaan, guru wali membina dan menilai, orang tua mendampingi,
                dan kepala sekolah memantau perkembangannya.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-full bg-gold-400 px-8 py-3.5 text-sm font-bold text-brand-950 shadow-lg shadow-gold-500/20 transition hover:bg-gold-300"
                >
                  Masuk ke jurnal
                </Link>
                <a
                  href="#alur"
                  className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Lihat cara kerjanya
                </a>
              </div>
              <p className="mt-5 text-sm text-brand-300">Murid masuk dengan NISN, guru dengan NIP.</p>
            </div>

            <JournalPage />
          </div>
        </section>

        {/* Visi sekolah */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-12 sm:px-6 md:flex-row md:items-center md:gap-10">
            <div className="flex shrink-0 items-center gap-3">
              <SchoolLogo size={52} />
              <p className="text-sm font-semibold leading-snug text-slate-500">
                Visi SMP Negeri 30
                <br />
                Semarang
              </p>
            </div>
            <blockquote className="border-l-4 border-gold-400 pl-5 text-xl font-bold leading-snug tracking-tight text-brand-950 sm:text-2xl md:border-l-0 md:border-t-0 md:pl-0">
              “Terwujudnya Murid yang Berprestasi, Berkarakter, serta Peduli Lingkungan.”
            </blockquote>
          </div>
        </section>

        {/* 7 Kebiasaan — lintasan dari pagi sampai malam */}
        <section id="kebiasaan" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
                Tujuh kebiasaan, dari bangun sampai tidur
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Urutannya mengikuti satu hari penuh murid. Setiap kebiasaan dicatat
                di jurnal, dan satu di antaranya dilengkapi foto bukti.
              </p>
            </div>

            {/* Desktop: lintasan horizontal */}
            <div className="relative mt-14 hidden lg:block">
              <div
                aria-hidden
                className="absolute left-[7%] right-[7%] top-5 h-1 rounded-full bg-gradient-to-r from-gold-400 via-brand-400 to-brand-950"
              />
              <div aria-hidden className="absolute -top-1 left-0 text-gold-500">
                <IconSun className="h-6 w-6" />
              </div>
              <div aria-hidden className="absolute -top-1 right-0 text-brand-950">
                <IconMoon className="h-6 w-6" />
              </div>
              <ol className="relative grid grid-cols-7 gap-4">
                {HABITS.map((h, i) => (
                  <li key={h.name} className="flex flex-col items-center text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-brand-600 text-sm font-extrabold text-white shadow-md shadow-brand-600/30">
                      {i + 1}
                    </span>
                    <span className="mt-4 text-xs font-semibold text-gold-700">{h.when}</span>
                    <span className="mt-1 text-[15px] font-bold leading-snug text-brand-950">{h.name}</span>
                    <span className="mt-2 text-sm leading-relaxed text-slate-500">{h.desc}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Mobile & tablet: lintasan vertikal */}
            <ol className="relative mt-10 space-y-6 lg:hidden">
              <span
                aria-hidden
                className="absolute bottom-3 left-[21px] top-3 w-1 rounded-full bg-gradient-to-b from-gold-400 via-brand-400 to-brand-950"
              />
              {HABITS.map((h, i) => (
                <li key={h.name} className="relative flex gap-4">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-white bg-brand-600 text-sm font-extrabold text-white shadow-md shadow-brand-600/30">
                    {i + 1}
                  </span>
                  <span className="pt-1">
                    <span className="block text-xs font-semibold text-gold-700">{h.when}</span>
                    <span className="block text-base font-bold text-brand-950">{h.name}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">{h.desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Peran */}
        <section id="peran" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
                Satu jurnal, lima peran
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Pembinaan berbasis relasi Guru Wali dan murid. Seorang guru wali
                dapat membina murid lintas kelas dan angkatan, dan penugasannya
                bisa berubah tanpa mengubah data murid.
              </p>
            </div>
            <ul className="glass-panel divide-y divide-slate-100 rounded-3xl">
              {ROLES.map(({ title, desc, Icon }) => (
                <li key={title} className="flex gap-4 p-6 sm:gap-5 sm:p-7">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-lg font-bold text-brand-950">{title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-slate-600">{desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Alur kerja */}
        <section id="alur" className="scroll-mt-20 border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
              Dari catatan murid sampai laporan sekolah
            </h2>
            <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <span
                aria-hidden
                className="absolute left-6 right-6 top-6 hidden h-px border-t-2 border-dashed border-brand-200 lg:block"
              />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-950 text-lg font-extrabold text-gold-300 ring-8 ring-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-brand-950">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">Pertanyaan umum</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Belum punya akun atau lupa kata sandi? Hubungi Admin sekolah.
              </p>
            </div>
            <div className="space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="glass-panel group rounded-2xl">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-base font-semibold text-brand-950 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition group-open:rotate-180 group-open:bg-brand-600 group-open:text-white">
                      <IconChevron />
                    </span>
                  </summary>
                  <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA akhir */}
        <section className="px-5 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand-950 px-8 py-12 text-white sm:px-14 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 [background-image:radial-gradient(36rem_24rem_at_100%_0%,rgb(58_98_224/0.5),transparent_60%)]"
            />
            <SchoolLogo size={220} className="pointer-events-none absolute -bottom-10 -right-6 opacity-[0.08] sm:right-8" />
            <div className="relative max-w-xl">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Sudah mencatat kebiasaanmu hari ini?</h2>
              <p className="mt-4 text-base text-brand-100">
                Masuk dengan akun yang diberikan Admin sekolah. Murid cukup memakai NISN.
              </p>
              <Link
                href="/login"
                className="mt-8 inline-block rounded-full bg-gold-400 px-8 py-3.5 text-sm font-bold text-brand-950 transition hover:bg-gold-300"
              >
                Masuk ke jurnal
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <BrandMark size={32} subtitle="Jurnal 7 Kebiasaan Anak Indonesia Hebat" />
          <span>&copy; {year} SMP Negeri 30 Semarang</span>
        </div>
      </footer>
    </div>
  );
}
