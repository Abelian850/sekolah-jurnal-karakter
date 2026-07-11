import { JournalTemplateCreateForm } from "@/components/journal-template-create-form";
import { createJournalTemplate } from "@/lib/template-actions";

/**
 * Buat template jurnal dari dashboard Guru Wali (revisi Juli 2026).
 * Tanpa pilihan sekolah: API mengunci schoolId ke sekolah guru sendiri
 * (lihat scopedSchoolId di apps/api/src/routes/journal-templates.ts).
 */
export default function GuruWaliTemplateBaruPage() {
  const onCreate = createJournalTemplate.bind(null, "/dashboard/guru-wali/template");

  return (
    <div className="glass-panel max-w-2xl rounded-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Buat Template Jurnal</h1>
      <JournalTemplateCreateForm onCreate={onCreate} />
    </div>
  );
}
