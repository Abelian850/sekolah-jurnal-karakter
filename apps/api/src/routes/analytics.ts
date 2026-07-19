import { Hono } from "hono";
import { and, desc, eq, gte, inArray, lte, isNotNull, sql, type SQL } from "drizzle-orm";
import { PERMISSIONS } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  students,
  teachers,
  teacherStudent,
  schools,
  journals,
  journalItems,
  journalTemplateItems,
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

/**
 * Siswa paling rajin mengisi jurnal (rencana kerja 18 Juli — Prioritas 3).
 * Menghitung jurnal berstatus submitted/approved per siswa aktif dalam
 * rentang `days` hari berakhir di `date`, urut menurun. Draft & rejected
 * sengaja tidak dihitung: draft belum dikirim, rejected berarti isinya
 * tidak sah menurut Guru Wali. Tanpa perubahan skema — unique index
 * (studentId, journalDate) menjamin maksimal 1 jurnal/siswa/hari.
 */
async function buildTopStudents(
  db: Database,
  schoolId: string | null,
  dateParam: string,
  days: number,
  limit: number
) {
  const asDate = new Date(`${dateParam}T00:00:00Z`);
  const rangeStart = new Date(asDate.getTime() - (days - 1) * 86400000)
    .toISOString()
    .slice(0, 10);

  const rows = await db
    .select({
      studentId: students.id,
      fullName: students.fullName,
      className: students.className,
      filled: sql<number>`count(*)::int`,
    })
    .from(journals)
    .innerJoin(students, eq(journals.studentId, students.id))
    .where(
      and(
        inArray(journals.status, ["submitted", "approved"]),
        gte(journals.journalDate, rangeStart),
        lte(journals.journalDate, dateParam),
        eq(students.isActive, true),
        schoolId ? eq(students.schoolId, schoolId) : undefined
      )
    )
    .groupBy(students.id, students.fullName, students.className)
    .orderBy(desc(sql`count(*)`), students.fullName)
    .limit(limit);

  return { date: dateParam, days, schoolId, students: rows };
}

function parseLimit(c: { req: { query: (k: string) => string | undefined } }): number {
  const raw = Number(c.req.query("limit") ?? "10");
  return Number.isInteger(raw) && raw >= 1 && raw <= 50 ? raw : 10;
}

/**
 * GET /analytics/top-students?date=YYYY-MM-DD&days=30&limit=10
 * (Kepala Sekolah). schoolId SELALU dari JWT — pola sama dengan /summary.
 */
analyticsRoute.get(
  "/top-students",
  authMiddleware,
  requirePermission(PERMISSIONS.SCHOOL_ANALYTICS_VIEW),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");

    if (!user.schoolId) {
      return c.json(
        {
          error: "no_school",
          message: "Akun kepala sekolah belum ditautkan ke sekolah. Hubungi Admin.",
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

    const data = await buildTopStudents(
      db,
      user.schoolId,
      parsed.dateParam,
      parsed.days,
      parseLimit(c)
    );
    return c.json({ data });
  }
);

/**
 * GET /analytics/admin-top-students?date=YYYY-MM-DD&days=30&limit=10&schoolId=<uuid>
 * (Admin). Tanpa schoolId = seluruh sekolah — pola sama dengan /admin-summary.
 */
analyticsRoute.get(
  "/admin-top-students",
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

    const data = await buildTopStudents(db, schoolId, parsed.dateParam, parsed.days, parseLimit(c));
    return c.json({ data });
  }
);

/**
 * GET /analytics/guru-wali-recap?from=YYYY-MM-DD&to=YYYY-MM-DD
 * (Guru Wali — rencana kerja 19 Juli, Prioritas 1).
 *
 * Rekap per siswa binaan AKTIF guru yang sedang login, untuk diunduh
 * sebagai Excel/PDF DI BROWSER (Workers tidak menggenerate file biner —
 * docs/bulk-import-export.md). Scoping identik dengan verifications.ts:
 * identitas guru diturunkan dari JWT (users.id -> teachers.userId), siswa
 * dibatasi lewat teacher_student.isActive — bukan dari parameter klien.
 *
 * Isi respons:
 * - meta        : nama sekolah, nama guru, periode, jumlah hari
 * - students    : per siswa — jumlah jurnal per status (draft/submitted/
 *                 approved/rejected), hari tanpa jurnal (totalDays dikurangi
 *                 seluruh jurnal; unique index (studentId, journalDate)
 *                 menjamin 1 jurnal/hari), rata-rata characterScore
 * - habits      : daftar 7 Kebiasaan (dari journal_template_items yang
 *                 muncul pada jurnal periode ini), urut orderIndex
 * - habitCounts : berapa kali tiap kebiasaan "selesai" per siswa. Hanya
 *                 jurnal submitted/approved yang dihitung — draft belum
 *                 dikirim, rejected berarti isinya tidak sah (rasional
 *                 sama dengan Siswa Terajin).
 */
analyticsRoute.get(
  "/guru-wali-recap",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_VERIFY),
  async (c) => {
    const db = c.get("db");
    const user = c.get("user");

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const from = c.req.query("from");
    const to = c.req.query("to");
    if (!from || !to || !dateRe.test(from) || !dateRe.test(to) || from > to) {
      return c.json(
        {
          error: "invalid_range",
          message: "Parameter from & to wajib (YYYY-MM-DD) dan from <= to",
          statusCode: 422,
        },
        422
      );
    }
    const totalDays =
      Math.round(
        (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
          86400000
      ) + 1;
    if (totalDays > 366) {
      return c.json(
        { error: "invalid_range", message: "Periode maksimal 366 hari", statusCode: 422 },
        422
      );
    }

    const [teacherRow] = await db
      .select({ id: teachers.id, fullName: teachers.fullName, schoolName: schools.name })
      .from(teachers)
      .innerJoin(schools, eq(teachers.schoolId, schools.id))
      .where(eq(teachers.userId, user.sub));
    if (!teacherRow) {
      return c.json(
        {
          error: "not_found",
          message: "Profil guru untuk akun ini tidak ditemukan. Hubungi Admin sekolah.",
          statusCode: 404,
        },
        404
      );
    }

    // Filter binaan aktif yang sama untuk semua query di bawah.
    const binaanJoin = and(
      eq(teacherStudent.studentId, journals.studentId),
      eq(teacherStudent.teacherId, teacherRow.id),
      eq(teacherStudent.isActive, true)
    );
    const rangeFilter = and(gte(journals.journalDate, from), lte(journals.journalDate, to));

    // ---- Daftar siswa binaan aktif ----
    const studentRows = await db
      .select({
        studentId: students.id,
        fullName: students.fullName,
        nisn: students.nisn,
        className: students.className,
      })
      .from(teacherStudent)
      .innerJoin(students, eq(teacherStudent.studentId, students.id))
      .where(
        and(
          eq(teacherStudent.teacherId, teacherRow.id),
          eq(teacherStudent.isActive, true),
          eq(students.isActive, true)
        )
      )
      .orderBy(students.className, students.fullName);

    // ---- Jumlah jurnal per status per siswa ----
    const statusRows = await db
      .select({
        studentId: journals.studentId,
        status: journals.status,
        count: sql<number>`count(*)::int`,
      })
      .from(journals)
      .innerJoin(teacherStudent, binaanJoin)
      .where(rangeFilter)
      .groupBy(journals.studentId, journals.status);

    // ---- Rata-rata nilai karakter per siswa ----
    const scoreRows = await db
      .select({
        studentId: journals.studentId,
        avgScore: sql<number>`round(avg(${verifications.characterScore}))::int`,
      })
      .from(verifications)
      .innerJoin(journals, eq(verifications.journalId, journals.id))
      .innerJoin(teacherStudent, binaanJoin)
      .where(and(isNotNull(verifications.characterScore), rangeFilter))
      .groupBy(journals.studentId);

    // ---- 7 Kebiasaan "selesai" per siswa (hanya jurnal terkirim/disetujui) ----
    const habitRows = await db
      .select({
        studentId: journals.studentId,
        templateItemId: journalItems.templateItemId,
        itemName: journalTemplateItems.itemName,
        orderIndex: journalTemplateItems.orderIndex,
        selesai: sql<number>`count(*) filter (where ${journalItems.status} = 'selesai')::int`,
      })
      .from(journalItems)
      .innerJoin(journals, eq(journalItems.journalId, journals.id))
      .innerJoin(
        journalTemplateItems,
        eq(journalItems.templateItemId, journalTemplateItems.id)
      )
      .innerJoin(teacherStudent, binaanJoin)
      .where(and(inArray(journals.status, ["submitted", "approved"]), rangeFilter))
      .groupBy(
        journals.studentId,
        journalItems.templateItemId,
        journalTemplateItems.itemName,
        journalTemplateItems.orderIndex
      );

    const statusMap = new Map<string, Record<string, number>>();
    for (const r of statusRows) {
      const entry = statusMap.get(r.studentId) ?? {};
      entry[r.status] = r.count;
      statusMap.set(r.studentId, entry);
    }
    const scoreMap = new Map(scoreRows.map((r) => [r.studentId, r.avgScore]));

    const studentsOut = studentRows.map((s) => {
      const st = statusMap.get(s.studentId) ?? {};
      const draft = st.draft ?? 0;
      const submitted = st.submitted ?? 0;
      const approved = st.approved ?? 0;
      const rejected = st.rejected ?? 0;
      return {
        ...s,
        draft,
        submitted,
        approved,
        rejected,
        daysWithoutJournal: Math.max(totalDays - (draft + submitted + approved + rejected), 0),
        avgScore: scoreMap.get(s.studentId) ?? null,
      };
    });

    // Daftar kebiasaan unik yang muncul di periode ini, urut orderIndex.
    const habitMap = new Map<string, { templateItemId: string; itemName: string; orderIndex: number }>();
    for (const r of habitRows) {
      if (!habitMap.has(r.templateItemId)) {
        habitMap.set(r.templateItemId, {
          templateItemId: r.templateItemId,
          itemName: r.itemName,
          orderIndex: r.orderIndex,
        });
      }
    }
    const habits = [...habitMap.values()].sort(
      (a, b) => a.orderIndex - b.orderIndex || a.itemName.localeCompare(b.itemName)
    );

    return c.json({
      data: {
        meta: {
          schoolName: teacherRow.schoolName,
          teacherName: teacherRow.fullName,
          from,
          to,
          totalDays,
        },
        students: studentsOut,
        habits,
        habitCounts: habitRows.map((r) => ({
          studentId: r.studentId,
          templateItemId: r.templateItemId,
          selesai: r.selesai,
        })),
      },
    });
  }
);
