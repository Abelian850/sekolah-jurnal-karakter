"use server";

import { apiFetch } from "@/lib/api-client";

export interface StudentImportRow {
  email: string;
  password: string;
  nis: string;
  nisn?: string;
  fullName: string;
  className: string;
  gradeLevel: string;
  gender?: "L" | "P";
  birthDate?: string;
}

export interface BulkImportResult {
  row: number;
  success: boolean;
  message?: string;
}

export async function bulkImportStudents(
  schoolId: string,
  rows: StudentImportRow[]
): Promise<BulkImportResult[]> {
  return apiFetch<BulkImportResult[]>("/students/bulk", {
    method: "POST",
    body: JSON.stringify({ schoolId, rows }),
  });
}
