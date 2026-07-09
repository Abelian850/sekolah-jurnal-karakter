import { Hono } from "hono";
import { and, eq, gte, lte, isNotNull, sql } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  students,
  teachers,
  journals,
  verifications,
} from "../db/schema";
import type { Env, Variables } from "../index";

export const analyticsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Analytics sekolah untuk Kepala Sekolah (Fase 7).
 * schoolId TIDAK diterima dari query - selalu dari JWT (profil principals,
 * lihat resolveSchoolId di apps/web/lib/auth.ts) agar KS tidak bisa
 * melihat data sekolah lain. "Hari ini" dikirim frontend via ?date=
 * (WIB, pola yang sama dengan /journals/today).
 *
 * GET /analytics/summary?date=YYYY-MM-DD&days=30
 * - counts       : siswa aktif, guru, guru wali
 * - today        : status jurnal pada `date` (draft/submitted/approved/rejected
 *                  + belum_membuat = siswa aktif tanpa jurnal)
 * - verification : distribusi hasil verifikasi `days` hari terakhir
 *                  (+ menunggu = submitted belum diverifikasi)
 * - avgScoreByClass / avgScore : rata-rata nilai karakter `days` hari terakhir
 * - trend        : 7 hari terakhir, jumlah jurnal terkirim vs siswa aktif
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

    const dateParam = c.req.query("date");
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return c.json(
        { error: "invalid_date", message: "Parameter date wajib (YYYY-MM-DD)", statusCode: 422 },
        422
      );
    }
    const daysRaw = Number(c.req.query("days") ?? "30");
    const days = Number.isInteger(daysRaw) && daysRaw >= 1 && daysRaw <= 90 ? daysRaw : 30;

    const asDate = new Date(`${dateParam}T00:00:00Z`);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const rangeStart = iso(new Date(asDate.getTime() - (days - 1) * 86400000));
    const trendStart = iso(new Date(asDate.getTime() - 6 * 86400000));

    // ---- Jumlah siswa aktif & guru ----
    const [studentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.isActive, true)));

    const [teacherCount] = await db
      .select({
        total: sql<number>`count(*)::int`,
        guruWali: sql<number>`count(*) filter (where ${teachers.isGuruWali})::int`,
      })
      .from(teachers)
      .where(eq(teachers.schoolId, schoolId));

    // ---- Status jurnal pada tanggal `date` ----
    const todayRows = await db
      .select({
        status: journals.status,
        count: sql<number>`count(*)::int`,
      })
      .from(journals)
      .innerJoin(students, eq(journals.studentId, students.id))
      .where(and(eq(students.schoolId, schoolId), eq(journals.journalDate, dateParam)))
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
          eq(students.schoolId, schoolId),
          gte(journals.journalDate, rangeStart),
          lte(journals.journalDate, dateParam)
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
          eq(students.schoolId, schoolId),
          eq(journals.status, "submitted"),
          sql`${verifications.id} is null`,
          gte(journals.journalDate, rangeStart),
          lte(journals.journalDate, dateParam)
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
          eq(students.schoolId, schoolId),
          isNotNull(verifications.characterScore),
          gte(journals.journalDate, rangeStart),
          lte(journals.journalDate, dateParam)
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
          eq(students.schoolId, schoolId),
          gte(journals.journalDate, trendStart),
          lte(journals.journalDate, dateParam)
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

    return c.json({
      data: {
        date: dateParam,
        days,
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
      },
    });
  }
);
