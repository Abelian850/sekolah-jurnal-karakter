import { createMiddleware } from "hono/factory";
import { roleHasPermission, type Permission } from "@sjk/shared";
import type { Env, Variables } from "../index";

/**
 * Middleware RBAC generik. Dipakai setelah authMiddleware, contoh:
 *
 *   app.get("/schools", authMiddleware, requirePermission(PERMISSIONS.SCHOOL_MANAGE), handler)
 *
 * Menolak request dengan 403 jika role user pada JWT tidak memiliki
 * permission yang diminta. Sumber kebenaran permission ada di
 * packages/shared/src/roles.ts (ROLE_PERMISSIONS) - satu tempat saja,
 * agar penambahan modul baru tidak perlu mengubah middleware ini.
 */
export function requirePermission(permission: Permission) {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        { error: "unauthorized", message: "User belum terautentikasi", statusCode: 401 },
        401
      );
    }

    if (!roleHasPermission(user.role, permission)) {
      return c.json(
        {
          error: "forbidden",
          message: `Role '${user.role}' tidak memiliki izin '${permission}'`,
          statusCode: 403,
        },
        403
      );
    }

    await next();
  });
}

/**
 * Middleware khusus Guru Wali: memastikan siswa yang diakses benar-benar
 * berada dalam binaan Guru Wali yang sedang login, dengan mengecek tabel
 * teacher_student secara langsung di database (bukan hanya percaya JWT).
 * Ini adalah lapisan keamanan tambahan sesuai desain Fase 1 Bab 7:
 * isolasi data Guru Wali WAJIB dicek ulang di service layer.
 */
export function requireOwnStudent() {
  return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    const user = c.get("user");
    const studentId = c.req.param("studentId");

    if (!user || !studentId) {
      return c.json(
        { error: "bad_request", message: "Parameter studentId diperlukan", statusCode: 400 },
        400
      );
    }

    const db = c.get("db");
    const { teacherStudent, teachers } = await import("../db/schema");
    const { eq, and } = await import("drizzle-orm");

    const rows = await db
      .select({ id: teacherStudent.id })
      .from(teacherStudent)
      .innerJoin(teachers, eq(teacherStudent.teacherId, teachers.id))
      .where(
        and(
          eq(teachers.userId, user.sub),
          eq(teacherStudent.studentId, studentId),
          eq(teacherStudent.isActive, true)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return c.json(
        {
          error: "forbidden",
          message: "Siswa ini bukan binaan Anda",
          statusCode: 403,
        },
        403
      );
    }

    await next();
  });
}
