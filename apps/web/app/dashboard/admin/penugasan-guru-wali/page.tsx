import { apiFetch } from "@/lib/api-client";
import { AssignGuruWaliForm } from "@/components/assign-guru-wali-form";

interface Student {
  id: string;
  fullName: string;
  className: string;
}

interface Teacher {
  id: string;
  fullName: string;
  isGuruWali: boolean;
}

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

export default async function PenugasanGuruWaliPage() {
  const [students, allTeachers, academicYears] = await Promise.all([
    apiFetch<Student[]>("/students"),
    apiFetch<Teacher[]>("/teachers"),
    apiFetch<AcademicYear[]>("/academic-years"),
  ]);

  const guruWaliList = allTeachers.filter((t) => t.isGuruWali);

  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Penugasan Guru Wali</h1>
      <p className="mb-4 text-sm text-slate-500">
        Guru Wali dapat membina siswa lintas kelas dan angkatan. Memindahkan Guru Wali di
        sini tidak mengubah data siswa sama sekali — hanya relasi penugasannya.
      </p>

      {students.length === 0 || guruWaliList.length === 0 || academicYears.length === 0 ? (
        <p className="text-sm text-slate-500">
          Pastikan sudah ada Peserta Didik, Guru dengan status Guru Wali, dan Tahun Pelajaran
          sebelum melakukan penugasan.
        </p>
      ) : (
        <AssignGuruWaliForm students={students} teachers={guruWaliList} academicYears={academicYears} />
      )}
    </div>
  );
}
