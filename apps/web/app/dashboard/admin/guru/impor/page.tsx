import { apiFetch } from "@/lib/api-client";
import { BulkImportTeachers } from "@/components/bulk-import-teachers";

interface School {
  id: string;
  name: string;
}

export default async function GuruImporPage() {
  const schools = await apiFetch<School[]>("/schools");

  return (
    <div className="glass-panel max-w-2xl rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Impor Guru dari Excel</h1>
      <p className="mb-4 text-sm text-slate-500">
        Kolom yang dibutuhkan: <code>nip, fullName, email, phone, isGuruWali</code>. Baris
        pertama harus berisi nama kolom ini persis. Hanya <code>nip</code> dan{" "}
        <code>fullName</code> yang wajib diisi - akun login dibuat otomatis dengan username
        &amp; kata sandi awal = NIP. Isi kolom <code>isGuruWali</code> dengan{" "}
        <code>ya</code> untuk menjadikan Guru Wali.
      </p>

      {schools.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada sekolah. Tambahkan sekolah terlebih dahulu.</p>
      ) : (
        <BulkImportTeachers schools={schools} />
      )}
    </div>
  );
}
