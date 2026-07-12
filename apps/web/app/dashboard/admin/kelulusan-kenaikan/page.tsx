import { apiFetch } from "@/lib/api-client";
import { GraduationPromotion } from "@/components/graduation-promotion";

interface School {
  id: string;
  name: string;
}

interface Student {
  id: string;
  schoolId: string;
  nisn: string | null;
  fullName: string;
  className: string;
  gradeLevel: string;
}

/**
 * Kelulusan & Kenaikan Kelas massal (lihat docs/catatan-sesi-2026-07-11.md).
 * Hanya siswa AKTIF yang ditawarkan (GET /students default aktif). Alumni
 * tidak dihapus — riwayat jurnal/nilai tetap terbaca dari dashboard.
 */
export default async function KelulusanKenaikanPage() {
  const [schools, students] = await Promise.all([
    apiFetch<School[]>("/schools"),
    apiFetch<Student[]>("/students"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-panel max-w-3xl rounded-2xl p-6">
        <h1 className="mb-1 text-xl font-semibold">Kelulusan &amp; Kenaikan Kelas</h1>
        <p className="text-sm text-slate-500">
          Jalankan <strong>setelah tahun pelajaran baru diaktifkan</strong>, dengan urutan:
          kelulusan angkatan tertinggi dulu, baru kenaikan kelas sisanya. Siswa yang lulus
          tidak dihapus — akun loginnya dinonaktifkan dan penugasan Guru Wali dilepas, tetapi
          seluruh riwayat jurnal dan nilai tetap tersimpan sebagai arsip.
        </p>
      </div>

      {schools.length === 0 || students.length === 0 ? (
        <div className="glass-panel max-w-3xl rounded-2xl p-6">
          <p className="text-sm text-slate-500">
            Pastikan sudah ada sekolah dan peserta didik aktif terlebih dahulu.
          </p>
        </div>
      ) : (
        <GraduationPromotion schools={schools} students={students} />
      )}
    </div>
  );
}
