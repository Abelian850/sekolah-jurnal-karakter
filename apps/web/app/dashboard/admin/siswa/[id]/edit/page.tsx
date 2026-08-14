import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { ResetStudentPasswordButton } from "@/components/reset-student-password-button";

/**
 * Halaman koreksi data murid (Admin). Pasangan dari halaman "Tambah Murid",
 * memakai pola yang sama: server action inline + apiFetch + redirect.
 *
 * NISN sengaja hanya ditampilkan, tidak bisa disunting di sini - alasannya
 * ada di catatan updateStudentSchema pada apps/api/src/routes/students.ts.
 * Singkatnya NISN adalah identitas login, bukan sekadar atribut.
 */

interface Student {
  id: string;
  nis: string | null;
  nisn: string | null;
  fullName: string;
  className: string;
  gradeLevel: string;
  gender: string | null;
  birthDate: string | null;
  isActive: boolean;
  status: string;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80";

const STATUS_LABEL: Record<string, string> = {
  lulus: "Alumni",
  pindah: "Pindah",
  keluar: "Keluar",
};

export default async function SiswaEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let student: Student;
  try {
    student = await apiFetch<Student>(`/students/${id}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) notFound();
    throw err;
  }

  async function updateStudent(formData: FormData) {
    "use server";

    // Semua field dikirim apa adanya: string kosong berarti "kosongkan"
    // (API menyimpannya NULL), bukan "jangan ubah". Yang tidak boleh dikirim
    // sama sekali adalah nisn - skema API memakai .strict() dan akan
    // menolaknya dengan 400 kalau sampai lolos ke sini.
    await apiFetch(`/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        nis: String(formData.get("nis") ?? ""),
        fullName: String(formData.get("fullName") ?? ""),
        className: String(formData.get("className") ?? ""),
        gender: String(formData.get("gender") ?? ""),
        birthDate: String(formData.get("birthDate") ?? ""),
      }),
    });

    // Daftar murid adalah Server Component; tanpa ini router cache Next bisa
    // menyajikan baris lama sesaat setelah redirect. Pola sama dengan
    // deleteStudent di siswa/actions.ts.
    revalidatePath("/dashboard/admin/siswa");
    redirect("/dashboard/admin/siswa");
  }

  return (
    <div className="glass-panel max-w-lg rounded-2xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Edit Murid</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {student.fullName}
            {!student.isActive && ` — ${STATUS_LABEL[student.status] ?? "Nonaktif"}`}
          </p>
        </div>
        <Link
          href="/dashboard/admin/siswa"
          className="shrink-0 text-xs text-brand-600 hover:underline"
        >
          Kembali ke daftar
        </Link>
      </div>

      <form action={updateStudent} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nama Lengkap</label>
          <input
            name="fullName"
            required
            minLength={3}
            defaultValue={student.fullName}
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">NIS (opsional)</label>
            <input name="nis" defaultValue={student.nis ?? ""} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">NISN</label>
            <input
              value={student.nisn ?? "-"}
              readOnly
              disabled
              className={`${INPUT_CLASS} cursor-not-allowed opacity-60`}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Kelas</label>
          <input
            name="className"
            required
            placeholder="IX"
            defaultValue={student.className}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-slate-500">
            Angkatan (sekarang <strong>{student.gradeLevel}</strong>) diisi ulang otomatis
            dari kata pertama. Mengubah &quot;VII A&quot; menjadi &quot;VIII A&quot; ikut
            memindahkan angkatannya ke VIII.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Jenis Kelamin</label>
            <select name="gender" defaultValue={student.gender ?? ""} className={INPUT_CLASS}>
              <option value="">-</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tanggal Lahir</label>
            <input
              type="date"
              name="birthDate"
              defaultValue={student.birthDate ?? ""}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
          <p>
            <strong>NISN tidak bisa diubah di sini.</strong> NISN adalah username login
            murid dan menjadi dasar kata sandi awalnya, jadi menggantinya bukan sekadar
            memperbaiki data — akunnya ikut berubah.
          </p>
          <p className="mt-2">
            Kalau NISN seorang murid memang salah: hapus murid tersebut lalu daftarkan
            ulang dengan NISN yang benar (hanya bisa selama dia belum punya jurnal). Kalau
            sudah ada jurnal, hubungi pengelola aplikasi — perbaikannya harus dilakukan
            langsung di database agar riwayat jurnalnya tidak ikut salah pemilik.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Simpan Perubahan
        </button>
      </form>

      {/*
        Reset kata sandi sengaja DI LUAR <form> di atas. Tombolnya komponen
        klien tersendiri yang memanggil server action-nya sendiri - kalau
        ditaruh di dalam form, klik padanya juga ikut men-submit formulir edit.
      */}
      <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Murid lupa kata sandi?
        </p>
        <ResetStudentPasswordButton
          studentId={student.id}
          studentName={student.fullName}
          nisn={student.nisn}
        />
      </div>
    </div>
  );
}
