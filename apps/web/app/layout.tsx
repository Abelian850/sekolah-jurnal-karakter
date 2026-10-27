import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Plus Jakarta Sans (SIL OFL) — huruf karya desainer Indonesia, disimpan
// lokal di app/fonts agar build tidak bergantung pada Google Fonts.
const jakarta = localFont({
  src: [
    { path: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2", weight: "200 800", style: "normal" },
  ],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jurnal 7 KAIH — SMP Negeri 30 Semarang",
  description:
    "Jurnal harian 7 Kebiasaan Anak Indonesia Hebat SMP Negeri 30 Semarang: murid mencatat, guru wali membina, orang tua mendampingi, kepala sekolah memantau.",
};

export const viewport: Viewport = {
  themeColor: "#0e1b45",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-paper font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
