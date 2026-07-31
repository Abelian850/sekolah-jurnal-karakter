import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jurnal Karakter & Monitoring Murid",
  description:
    "Aplikasi jurnal karakter dan monitoring murid berbasis Guru Wali lintas kelas dan angkatan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-[#f4f6fb] text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
