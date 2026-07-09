import { eq, asc, sql } from "drizzle-orm";
import { comments, users, roles, parents, teachers, students, principals } from "../db/schema";
import type { Database } from "../db/client";

/**
 * Daftar komentar satu jurnal, terurut lama -> baru, dengan nama penulis
 * di-resolve dari tabel profil sesuai role (COALESCE lintas profil karena
 * comments.userId menunjuk users, bukan salah satu tabel profil).
 * Dipakai oleh: detail jurnal orang tua (children.ts), halaman periksa
 * guru wali (verifications.ts), dan detail jurnal siswa (journals.ts).
 */
export async function listComments(db: Database, journalId: string) {
  return db
    .select({
      id: comments.id,
      journalId: comments.journalId,
      userId: comments.userId,
      body: comments.body,
      createdAt: comments.createdAt,
      authorRole: roles.name,
      authorName: sql<string>`coalesce(${parents.fullName}, ${teachers.fullName}, ${students.fullName}, ${principals.fullName}, ${users.email})`,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(parents, eq(parents.userId, users.id))
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .leftJoin(students, eq(students.userId, users.id))
    .leftJoin(principals, eq(principals.userId, users.id))
    .where(eq(comments.journalId, journalId))
    .orderBy(asc(comments.createdAt));
}
