export default function AdminOverviewPage() {
  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-2 text-xl font-semibold">Ringkasan</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Selamat datang di panel Administrator. Gunakan menu di samping untuk mengelola
        Sekolah, Tahun Pelajaran, dan Semester. Modul Guru, Guru Wali, Peserta Didik,
        Orang Tua, dan Bulk Import/Export akan tersedia di Fase 4.
      </p>
    </div>
  );
}
