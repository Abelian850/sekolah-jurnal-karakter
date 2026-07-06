import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jurnal Karakter & Monitoring Peserta Didik",
  description:
    "Aplikasi jurnal karakter dan monitoring peserta didik berbasis Guru Wali, bukan Wali Kelas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
