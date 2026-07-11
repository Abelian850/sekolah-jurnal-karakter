import { notFound } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import {
  JournalTemplateDetailView,
  type TemplateDetail,
} from "@/components/journal-template-detail";

export default async function GuruWaliTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let template: TemplateDetail;
  try {
    template = await apiFetch<TemplateDetail>(`/journal-templates/${id}`);
  } catch (err) {
    // API mengembalikan 404 juga saat template milik sekolah lain.
    if (err instanceof ApiRequestError && err.statusCode === 404) notFound();
    throw err;
  }

  return (
    <JournalTemplateDetailView template={template} basePath="/dashboard/guru-wali/template" />
  );
}
