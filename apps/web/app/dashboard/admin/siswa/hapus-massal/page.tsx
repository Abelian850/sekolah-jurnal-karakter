import { BulkDeleteStudents } from "@/components/bulk-delete-students";

export default function SiswaHapusMassalPage() {
  return (
    <div className="glass-panel max-w-2xl rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Hapus Massal Peserta Didik</h1>
      <p className="mb-2 text-sm text-slate-500">
        Unggah file Excel berisi kolom <code>nisn</code> (baris pertama = header). Semua siswa
        dengan NISN di daftar akan dihapus <strong>beserta akun login-nya</strong>. Kolom lain
        diabaikan, jadi file hasil &quot;Export Excel&quot; bisa langsung dipakai — buang dulu
        baris siswa yang tidak ingin dihapus.
      </p>
      <p className="mb-4 text-sm text-amber-600">
        Siswa yang sudah punya jurnal otomatis dilewati (tidak dihapus) demi menjaga riwayat
        pengisian dan nilai. Penghapusan hanya berdasarkan NISN, bukan nama, karena nama tidak
        unik.
      </p>

      <BulkDeleteStudents />
    </div>
  );
}
