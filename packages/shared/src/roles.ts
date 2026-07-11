/**
 * Definisi peran (role) sistem.
 * PENTING: nilai ini harus identik dengan baris pada tabel `roles` di database
 * (lihat apps/api/src/db/schema.ts -> roleEnum). Jangan mengubah salah satu
 * tanpa mengubah yang lain.
 */
export const ROLES = {
  ADMIN: "admin",
  KEPALA_SEKOLAH: "kepala_sekolah",
  GURU_WALI: "guru_wali",
  GURU: "guru",
  ORANG_TUA: "orang_tua",
  PESERTA_DIDIK: "peserta_didik",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: Role[] = Object.values(ROLES);

/**
 * Peta permission per modul. Dipakai oleh middleware RBAC di apps/api
 * agar penambahan modul baru tidak perlu mengubah logic middleware,
 * cukup menambah entri di sini dan mendaftarkan route dengan permission
 * yang sesuai.
 */
export const PERMISSIONS = {
  SCHOOL_MANAGE: "school:manage",
  ACADEMIC_YEAR_MANAGE: "academic_year:manage",
  TEACHER_MANAGE: "teacher:manage",
  PRINCIPAL_MANAGE: "principal:manage",
  STUDENT_MANAGE: "student:manage",
  PARENT_MANAGE: "parent:manage",
  TEACHER_STUDENT_ASSIGN: "teacher_student:assign",
  JOURNAL_TEMPLATE_MANAGE: "journal_template:manage",
  BULK_IMPORT_EXPORT: "bulk:import_export",
  BACKUP_RESTORE: "backup:restore",
  AUDIT_LOG_VIEW: "audit_log:view",
  SCHOOL_ANALYTICS_VIEW: "analytics:view",
  STUDENT_LIST_OWN: "student:list_own", // Guru Wali - hanya siswa binaan
  JOURNAL_FILL: "journal:fill",
  JOURNAL_VERIFY: "journal:verify",
  JOURNAL_VIEW_OWN: "journal:view_own",
  JOURNAL_VIEW_CHILD: "journal:view_child",
  COMMENT_CREATE: "comment:create",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Matriks role -> permission. Sumber kebenaran tunggal untuk RBAC di seluruh
 * aplikasi. Middleware di apps/api/src/middleware/rbac.ts membaca dari sini.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.SCHOOL_MANAGE,
    PERMISSIONS.ACADEMIC_YEAR_MANAGE,
    PERMISSIONS.TEACHER_MANAGE,
    PERMISSIONS.PRINCIPAL_MANAGE,
    PERMISSIONS.STUDENT_MANAGE,
    PERMISSIONS.PARENT_MANAGE,
    PERMISSIONS.TEACHER_STUDENT_ASSIGN,
    PERMISSIONS.JOURNAL_TEMPLATE_MANAGE,
    PERMISSIONS.BULK_IMPORT_EXPORT,
    PERMISSIONS.BACKUP_RESTORE,
    PERMISSIONS.AUDIT_LOG_VIEW,
  ],
  [ROLES.KEPALA_SEKOLAH]: [PERMISSIONS.SCHOOL_ANALYTICS_VIEW],
  [ROLES.GURU_WALI]: [
    PERMISSIONS.STUDENT_LIST_OWN,
    PERMISSIONS.JOURNAL_VERIFY,
    // Revisi Juli 2026: Guru Wali ikut mengelola template jurnal sekolahnya
    // sendiri (routes/journal-templates.ts membatasi scope ke schoolId JWT;
    // hanya Admin yang lintas sekolah).
    PERMISSIONS.JOURNAL_TEMPLATE_MANAGE,
  ],
  [ROLES.GURU]: [PERMISSIONS.STUDENT_LIST_OWN],
  [ROLES.ORANG_TUA]: [PERMISSIONS.JOURNAL_VIEW_CHILD, PERMISSIONS.COMMENT_CREATE],
  [ROLES.PESERTA_DIDIK]: [PERMISSIONS.JOURNAL_FILL, PERMISSIONS.JOURNAL_VIEW_OWN],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Payload JWT yang diterbitkan Auth.js (apps/web) dan diverifikasi oleh
 * middleware Hono (apps/api). Kedua sisi WAJIB memakai secret yang sama
 * (env AUTH_SECRET) dan bentuk payload yang sama seperti ini.
 */
export interface AppJwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
  schoolId: string | null;
  iat: number;
  exp: number;
}
