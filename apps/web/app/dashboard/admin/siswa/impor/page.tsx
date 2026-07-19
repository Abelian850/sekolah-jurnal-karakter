import { apiFetch } from "@/lib/api-client";
import { BulkImportStudents } from "@/components/bulk-import-students";

interface School {
  id: string;
  name: string;
}

export default async function SiswaImporPage() {
  const schools = await apiFetch<School[]>("/schools");

  return (
    <div className="glass-panel max-w-2xl rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Impor Peserta Didik dari Excel</h1>
      <p className="mb-4 text-sm text-slate-500">
        Kolom yang dibutuhkan: <code>nisn, fullName, className</code>; opsional:
        <code> nis, gradeLevel, gender, birthDate</code>. Baris pertama harus berisi nama kolom ini
        persis. Jika <code>gradeLevel</code> kosong, angkatan diambil otomatis dari kata pertama
        kelas (&quot;IX A&quot; &rarr; &quot;IX&quot;).
      </p>

      {schools.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada sekolah. Tambahkan sekolah terlebih dahulu.</p>
      ) : (
        <BulkImportStudents schools={schools} />
      )}
    </div>
  );
}
