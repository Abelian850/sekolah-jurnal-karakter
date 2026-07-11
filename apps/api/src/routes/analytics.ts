import { Hono } from "hono";
import { and, eq, gte, lte, isNotNull, sql, type SQL } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  students,
  teachers,
  journals,
  verifications,
} from "../db/schema";
import type { Database } from "../db/client";
import type { Env, Variables } from "../index";

export const analyticsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Ringkasan analitik satu sekolah ATAU gabungan semua sekolah
 * (schoolId = null). Dipakai oleh dua endpoint:
 * - GET /analytics/summary        (Kepala Sekolah - selalu sekolahnya sendiri)
 * - GET /analytics/admin-summary  (Admin - gabungan, atau difilter per sekolah)
 *
 * Isi ringkasan:
 * - counts       : siswa aktif, guru, guru wali
 * - today        : status jurnal pada `date` (draft/submitted/approved/rejected
 *                  + belum_membuat = siswa aktif tanpa jurnal)
 * - verification : distribusi hasil verifikasi `days` hari terakhir
 *                  (+ menunggu = submitted belum diverifikasi)
 * - avgScoreByClass / avgScore : rata-rata nilai karakter `days` hari terakhir
 * - trend        : 7 hari terakhir, jumlah jurnal terkirim per tanggal
 */
async function buildSummary(
  db: Database,
  schoolId: string | null,
  dateParam: string,
  days: number
) {
  const asDate = new Date(`${dateParam}T00:00:00Z`);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const rangeStart = iso(new Date(asDate.getTime() - (days - 1) * 86400000));
  const trendStart = iso(new Date(asDate.getTime() - 6 * 86400000));

  // Filter sekolah opsional: undefined dalam and(...) diabaikan drizzle,
  // sehingga query yang sama melayani mode per-sekolah maupun gabungan.
  const studentSchoolFilter: SQL | undefined = schoolId
    ? eq(students.schoolId, schoolId)
    : undefined;

  // ---- Jumlah siswa aktif & guru ----
  const [studentCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(students)
    .where(and(eq(students.isActive, true), studentSchoolFilter));

  const [teacherCount] = await db
    .select({
      total: sql<number>`count(*)::int`,
      guruWali: sql<number>`count(*) filter (where ${teachers.isGuruWali})::int`,
    })
    .from(teachers)
    .where(schoolId ? eq(teachers.schoolId, schoolId) : undefined);

  // ---- Status jurnal pada tanggal `date` ----
  const todayRows = await db
    .select({
      status: journals.status,
      count: sql<number>`count(*)::int`,
    })
    .from(journals)
    .innerJoin(students, eq(journals.studentId, students.id))
    .where(and(eq(journals.journalDate, dateParam), studentSchoolFilter))
    .groupBy(journals.status);

  const today = { draft: 0, submitted: 0, approved: 0, rejected: 0 };
  for (const row of todayRows) today[row.status] = row.count;
  const totalToday = today.draft + today.submitted + today.approved + today.rejected;

  // ---- Distribusi verifikasi `days` hari terakhir ----
  const verifRows = await db
    .select({
      status: verifications.status,
      count: sql<number>`count(*)::int`,
    })
    .from(verifications)
    .innerJoin(journals, eq(verifications.journalId, journals.id))
    .innerJoin(students, eq(journals.studentId, students.id))
    .where(
      and(
        gte(journals.journalDate, rangeStart),
        lte(journals.journalDate, dateParam),
        studentSchoolFilter
      )
    )
    .groupBy(verifications.status);

  const verification = { disetujui: 0, ditolak: 0, revisi: 0, menunggu: 0 };
  for (const row of verifRows) verification[row.status] = row.count;

  const [waiting] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(journals)
    .innerJoin(students, eq(journals.studentId, students.id))
    .leftJoin(verifications, eq(verifications.journalId, journals.id))
    .where(
      and(
        eq(journals.status, "submitted"),
        sql`${verifications.id} is null`,
        gte(journals.journalDate, rangeStart),
        lte(journals.journalDate, dateParam),
        studentSchoolFilter
      )
    );
  verification.menunggu = waiting?.count ?? 0;

  // ---- Rata-rata nilai karakter per kelas (`days` hari terakhir) ----
  const avgRows = await db
    .select({
      className: students.className,
      avgScore: sql<number>`round(avg(${verifications.characterScore}))::int`,
      scored: sql<number>`count(${verifications.characterScore})::int`,
    })
    .from(verifications)
    .innerJoin(journals, eq(verifications.journalId, journals.id))
    .innerJoin(students, eq(journals.studentId, students.id))
    .where(
      and(
        isNotNull(verifications.characterScore),
        gte(journals.journalDate, rangeStart),
        lte(journals.journalDate, dateParam),
        studentSchoolFilter
      )
    )
    .groupBy(students.className)
    .orderBy(students.className);

  const totalScored = avgRows.reduce((acc, r) => acc + r.scored, 0);
  const avgScore =
    totalScored > 0
      ? Math.round(
          avgRows.reduce((acc, r) => acc + r.avgScore * r.scored, 0) / totalScored
        )
      : null;

  // ---- Tren 7 hari terakhir: jurnal terkirim per tanggal ----
  const trendRows = await db
    .select({
      journalDate: journals.journalDate,
      sent: sql<number>`count(*) filter (where ${journals.status} in ('submitted','approved','rejected'))::int`,
    })
    .from(journals)
    .innerJoin(students, eq(journals.studentId, students.id))
    .where(
      and(
        gte(journals.journalDate, trendStart),
        lte(journals.journalDate, dateParam),
        studentSchoolFilter
      )
    )
    .groupBy(journals.journalDate)
    .orderBy(journals.journalDate);

  const trendMap = new Map(trendRows.map((r) => [r.journalDate, r.sent]));
  const trend: { date: string; sent: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = iso(new Date(asDate.getTime() - i * 86400000));
    trend.push({ date: d, sent: trendMap.get(d) ?? 0 });
  }

  return {
    date: dateParam,
    days,
    schoolId,
    counts: {
      activeStudents: studentCount?.count ?? 0,
      teachers: teacherCount?.total ?? 0,
      guruWali: teacherCount?.guruWali ?? 0,
    },
    today: {
      ...today,
      belumMembuat: Math.max((studentCount?.count ?? 0) - totalToday, 0),
    },
    verification,
    avgScore,
    avgScoreByClass: avgRows,
    trend,
  };
}

function parseDateAndDays(c: {
  req: { query: (k: string) => string | undefined };
}): { dateParam: string; days: number } | null {
  const dateParam = c.req.query("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return null;
  const daysRaw = Number(c.req.query("days") ?? "30");
  const days = Number.isInteger(daysRaw) && daysRaw >= 1 && daysRaw <= 90 ? daysRaw : 30;
  return { dateParam, days };
}

/**
 * GET /analytics/summary?date=YYYY-MM-DD&days=30 (Kepala Sekolah, Fase 7).
 * schoolId TIDAK diterima dari query - selalu dari JWT (profil principals,
 * lihat resolveSchoolId di apps/web/lib/auth.ts) agar KS tidak bisa
 * melihat data sekolah lain. "Hari ini" dikirim frontend via ?date=
 * (WIB, pola yang sama dengan /journals/today).
 */
analyticsRoute.get(
  "/summary",
  authMiddleware,
  requirePermission(PERMISSIONS.SCHOOL_ANALYTICS_VIEW),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    const schoolId = user.schoolId;

    if (!schoolId) {
      return c.json(
        {
          error: "no_school",
          message:
            "Akun kepala sekolah belum ditautkan ke sekolah. Hubungi Admin.",
          statusCode: 422,
        },
        422
      );
    }

    const parsed = parseDateAndDays(c);
    if (!parsed) {
      return c.json(
        { error: "invalid_date", message: "Parameter date wajib (YYYY-MM-DD)", statusCode: 422 },
        422
      );
    }

    const data = await buildSummary(db, schoolId, parsed.dateParam, parsed.days);
    return c.json({ data });
  }
);

/**
 * GET /analytics/admin-summary?date=YYYY-MM-DD&days=30&schoolId=<uuid>
 * (Admin, dashboard Ringkasan). Tanpa schoolId = gabungan SEMUA sekolah;
 * dengan schoolId = difilter satu sekolah. Digerbangi SCHOOL_MANAGE
 * (hanya admin) - berbeda dari /summary yang mengunci ke sekolah di JWT.
 */
analyticsRoute.get(
  "/admin-summary",
  authMiddleware,
  requirePermission(PERMISSIONS.SCHOOL_MANAGE),
  async (c) => {
    const db = c.get("db");

    const parsed = parseDateAndDays(c);
    if (!parsed) {
      return c.json(
        { error: "invalid_date", message: "Parameter date wajib (YYYY-MM-DD)", statusCode: 422 },
        422
      );
    }

    const schoolIdRaw = c.req.query("schoolId");
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const schoolId = schoolIdRaw && uuidRe.test(schoolIdRaw) ? schoolIdRaw : null;

    const data = await buildSummary(db, schoolId, parsed.dateParam, parsed.days);
    return c.json({ data });
  }
);
