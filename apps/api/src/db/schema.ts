import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  time,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Skema database sesuai ERD Fase 1 (lihat docs/erd.mermaid di dokumentasi Fase 1).
 * Relasi inti sistem: teacherStudent menghubungkan Guru Wali <-> Peserta Didik
 * secara independen dari kelas, dan bersifat historis (ada assignedAt/unassignedAt)
 * sehingga penggantian Guru Wali TIDAK PERNAH mengubah baris di tabel `students`.
 */

// ---------- ENUM ----------
export const roleEnum = pgEnum("role_name", [
  "admin",
  "kepala_sekolah",
  "guru_wali",
  "guru",
  "orang_tua",
  "peserta_didik",
]);

export const journalStatusEnum = pgEnum("journal_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export const itemStatusEnum = pgEnum("item_status", ["selesai", "belum", "sebagian"]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "disetujui",
  "ditolak",
  "revisi",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "belum_isi_jurnal",
  "disetujui",
  "ditolak",
  "revisi",
  "komentar",
]);

// ---------- TABEL INTI ----------
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: roleEnum("name").notNull().unique(),
  description: text("description"),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  npsn: varchar("npsn", { length: 20 }).unique(),
  address: text("address"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const academicYears = pgTable("academic_years", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  year: varchar("year", { length: 20 }).notNull(), // contoh: "2026/2027"
  isActive: boolean("is_active").notNull().default(false),
});

export const semesters = pgTable("semesters", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 20 }).notNull(), // "Ganjil" | "Genap"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
});

export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  nip: varchar("nip", { length: 30 }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  isGuruWali: boolean("is_guru_wali").notNull().default(false),
});

/**
 * Profil Kepala Sekolah (Fase 7). Mengikuti pola profil teachers/students:
 * users menyimpan kredensial, tabel profil menyimpan schoolId + identitas.
 * userId unik (satu akun = satu profil); schoolId sengaja TIDAK unik agar
 * masa transisi (pergantian kepala sekolah) tidak terblokir constraint.
 * resolveSchoolId di apps/web/lib/auth.ts membaca schoolId dari sini.
 */
export const principals = pgTable("principals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
});

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    nis: varchar("nis", { length: 30 }).notNull(),
    nisn: varchar("nisn", { length: 30 }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    // className adalah ATRIBUT siswa, bukan foreign key ke guru mana pun.
    // Ini yang membuat Guru Wali bisa berganti tanpa menyentuh baris ini.
    className: varchar("class_name", { length: 20 }).notNull(), // "VII A"
    gradeLevel: varchar("grade_level", { length: 10 }).notNull(), // "VII"
    gender: varchar("gender", { length: 10 }),
    birthDate: date("birth_date"),
    photoUrl: text("photo_url"),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    nisIdx: uniqueIndex("students_nis_idx").on(table.schoolId, table.nis),
    // NISN unik nasional - dipakai sebagai username login siswa
    // (pasca-Fase 6). Unique index Postgres mengizinkan banyak NULL,
    // jadi data siswa lama tanpa NISN tidak melanggar constraint.
    nisnIdx: uniqueIndex("students_nisn_idx").on(table.nisn),
    classIdx: index("students_class_idx").on(table.className),
  })
);

export const parents = pgTable("parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  relation: varchar("relation", { length: 20 }), // "ayah" | "ibu" | "wali"
});

export const studentParent = pgTable(
  "student_parent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
  },
  (table) => ({
    uniquePair: uniqueIndex("student_parent_unique").on(table.studentId, table.parentId),
  })
);

/**
 * TABEL RELASI INTI: Guru Wali <-> Peserta Didik.
 * assignedAt/unassignedAt membuat relasi ini historis, sehingga:
 * 1. Memindahkan Guru Wali = insert baris baru + set unassignedAt pada baris lama.
 * 2. Data siswa (tabel students) tidak pernah perlu diubah saat Guru Wali berganti.
 * 3. Query "siapa Guru Wali siswa X saat ini" = WHERE studentId = X AND isActive = true.
 */
export const teacherStudent = pgTable(
  "teacher_student",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    activeIdx: index("teacher_student_active_idx").on(table.studentId, table.isActive),
    teacherIdx: index("teacher_student_teacher_idx").on(table.teacherId, table.isActive),
  })
);

export const journalTemplates = pgTable("journal_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const journalTemplateItems = pgTable("journal_template_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalTemplateId: uuid("journal_template_id")
    .notNull()
    .references(() => journalTemplates.id, { onDelete: "cascade" }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  itemType: varchar("item_type", { length: 20 }).notNull(), // checklist|waktu|catatan|foto
  orderIndex: integer("order_index").notNull().default(0),
});

export const journals = pgTable(
  "journals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    journalTemplateId: uuid("journal_template_id")
      .notNull()
      .references(() => journalTemplates.id, { onDelete: "restrict" }),
    semesterId: uuid("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "restrict" }),
    journalDate: date("journal_date").notNull(),
    status: journalStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => ({
    // Satu siswa hanya boleh punya satu jurnal per tanggal.
    uniqueDaily: uniqueIndex("journals_student_date_idx").on(table.studentId, table.journalDate),
  })
);

export const journalItems = pgTable("journal_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalId: uuid("journal_id")
    .notNull()
    .references(() => journals.id, { onDelete: "cascade" }),
  templateItemId: uuid("template_item_id")
    .notNull()
    .references(() => journalTemplateItems.id, { onDelete: "restrict" }),
  status: itemStatusEnum("status").notNull().default("belum"),
  recordedTime: time("recorded_time"),
  note: text("note"),
  photoUrl: text("photo_url"), // URL objek di Cloudflare R2
});

/**
 * Kebiasaan wajib berbukti foto per HARI, ditetapkan oleh Guru Wali untuk
 * seluruh siswa binaannya (requirement 7 Kebiasaan Anak Indonesia Hebat).
 * - Satu baris per (guru, tanggal); ganti pilihan = UPSERT baris yang sama.
 * - Menunjuk journal_template_items (bukan journal_items) supaya berlaku
 *   untuk semua jurnal siswa binaan pada tanggal itu.
 * - Jika tidak ada baris untuk tanggal tsb (guru belum/lupa menetapkan),
 *   fallback: siswa tetap wajib melampirkan minimal SATU foto pada
 *   kebiasaan mana pun (lihat validasi submit di routes/journals.ts).
 */
export const evidenceRequirements = pgTable(
  "evidence_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    requirementDate: date("requirement_date").notNull(),
    templateItemId: uuid("template_item_id")
      .notNull()
      .references(() => journalTemplateItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueDaily: uniqueIndex("evidence_requirements_teacher_date_idx").on(
      table.teacherId,
      table.requirementDate
    ),
  })
);

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalId: uuid("journal_id")
    .notNull()
    .unique()
    .references(() => journals.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "restrict" }),
  status: verificationStatusEnum("status").notNull(),
  note: text("note"),
  characterScore: integer("character_score"), // 1-100
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Komentar pada jurnal (Fase 7). Ditulis oleh Orang Tua (COMMENT_CREATE)
 * pada jurnal anaknya; dibaca oleh Guru Wali saat verifikasi dan oleh
 * siswa pemilik jurnal. userId menunjuk users (bukan parents) supaya
 * ke depan guru wali/siswa juga bisa membalas tanpa migrasi ulang.
 */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalId: uuid("journal_id")
      .notNull()
      .references(() => journals.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    journalIdx: index("comments_journal_idx").on(table.journalId),
  })
);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value"),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 50 }).notNull(), // create|update|delete
  tableName: varchar("table_name", { length: 100 }).notNull(),
  recordId: uuid("record_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- RELATIONS (untuk drizzle query API) ----------
export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
}));

export const studentsRelations = relations(students, ({ many, one }) => ({
  school: one(schools, { fields: [students.schoolId], references: [schools.id] }),
  guardians: many(teacherStudent),
  parents: many(studentParent),
  journals: many(journals),
}));

export const teachersRelations = relations(teachers, ({ many, one }) => ({
  school: one(schools, { fields: [teachers.schoolId], references: [schools.id] }),
  students: many(teacherStudent),
}));

export const teacherStudentRelations = relations(teacherStudent, ({ one }) => ({
  teacher: one(teachers, { fields: [teacherStudent.teacherId], references: [teachers.id] }),
  student: one(students, { fields: [teacherStudent.studentId], references: [students.id] }),
  academicYear: one(academicYears, {
    fields: [teacherStudent.academicYearId],
    references: [academicYears.id],
  }),
}));

export const principalsRelations = relations(principals, ({ one }) => ({
  school: one(schools, { fields: [principals.schoolId], references: [schools.id] }),
  user: one(users, { fields: [principals.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  journal: one(journals, { fields: [comments.journalId], references: [journals.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const journalsRelations = relations(journals, ({ one, many }) => ({
  student: one(students, { fields: [journals.studentId], references: [students.id] }),
  template: one(journalTemplates, {
    fields: [journals.journalTemplateId],
    references: [journalTemplates.id],
  }),
  items: many(journalItems),
  verification: one(verifications, {
    fields: [journals.id],
    references: [verifications.journalId],
  }),
  comments: many(comments),
}));

export const journalItemsRelations = relations(journalItems, ({ one }) => ({
  journal: one(journals, { fields: [journalItems.journalId], references: [journals.id] }),
  templateItem: one(journalTemplateItems, {
    fields: [journalItems.templateItemId],
    references: [journalTemplateItems.id],
  }),
}));
