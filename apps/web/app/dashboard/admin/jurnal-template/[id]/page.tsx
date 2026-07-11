import { apiFetch } from "@/lib/api-client";
import {
  JournalTemplateDetailView,
  type TemplateDetail,
} from "@/components/journal-template-detail";

export default async function JurnalTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await apiFetch<TemplateDetail>(`/journal-templates/${id}`);

  return (
    <JournalTemplateDetailView template={template} basePath="/dashboard/admin/jurnal-template" />
  );
}
