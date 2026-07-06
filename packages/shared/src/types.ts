export const JOURNAL_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
export type JournalStatus = (typeof JOURNAL_STATUS)[keyof typeof JOURNAL_STATUS];

export const ITEM_STATUS = {
  SELESAI: "selesai",
  BELUM: "belum",
  SEBAGIAN: "sebagian",
} as const;
export type ItemStatus = (typeof ITEM_STATUS)[keyof typeof ITEM_STATUS];

export interface ApiErrorBody {
  error: string;
  message: string;
  statusCode: number;
}

export interface ApiSuccessBody<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}
