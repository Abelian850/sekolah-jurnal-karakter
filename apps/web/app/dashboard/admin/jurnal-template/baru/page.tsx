import { apiFetch } from "@/lib/api-client";
import { JournalTemplateCreateForm } from "@/components/journal-template-create-form";

interface School {
  id: string;
  name: string;
}

export default async function JurnalTemplateBaruPage() {
  const schools = await apiFetch<School[]>("/schools");

  return (
    <div className="glass-panel max-w-2xl rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Buat Template Jurnal</h1>

      {schools.length === 0 ? (
        <p className="text-sm text-slate-500">
          Belum ada sekolah. Tambahkan sekolah terlebih dahulu di menu Sekolah.
        </p>
      ) : (
        <JournalTemplateCreateForm schools={schools} />
      )}
    </div>
  );
}
