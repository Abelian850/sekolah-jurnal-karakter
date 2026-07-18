import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { users, auditLogs } from "../db/schema";
import type { Env, Variables } from "../index";

export const meRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /me - mengembalikan payload identitas dari token API yang sudah
 * diverifikasi middleware. Dipakai untuk sanity-check bahwa alur
 * Auth.js -> mint token -> verifikasi Hono berjalan end-to-end, dan bisa
 * dipakai frontend untuk menampilkan info user tanpa query database lagi.
 */
meRoute.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({ data: user });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Kata sandi lama wajib diisi"),
  newPassword: z
    .string()
    .min(8, "Kata sandi baru minimal 8 karakter")
    .max(100, "Kata sandi baru maksimal 100 karakter"),
});

/**
 * PATCH /me/password - ganti kata sandi mandiri (Fase 9, hardening).
 *
 * Latar: kata sandi awal guru = NIP dan siswa = NISN — keduanya bukan
 * rahasia, sehingga SEMUA peran wajib bisa mengganti sandinya sendiri
 * tanpa bantuan Admin. Endpoint ini terbuka untuk semua user yang login
 * (cukup authMiddleware, tanpa cek permission).
 *
 * Keamanan:
 * - Wajib memverifikasi sandi lama sebelum mengganti (mencegah pembajakan
 *   sesi yang ditinggal terbuka mengganti sandi tanpa tahu sandi lama).
 * - CATATAN runtime Workers: hash argon2 lama TIDAK bisa diverifikasi di
 *   sini (WASM dilarang, lihat packages/shared/src/password.ts). Akun
 *   dengan hash argon2 (mis. admin hasil seed lama) diberi pesan error
 *   eksplisit agar tidak tampak seperti "sandi lama salah".
 * - Audit log TIDAK menyimpan hash lama/baru — hanya penanda field.
 */
meRoute.patch(
  "/password",
  authMiddleware,
  zValidator("json", changePasswordSchema),
  async (c) => {
    const db = c.get("db");
    const payload = c.get("user");
    const { currentPassword, newPassword } = c.req.valid("json");

    const [account] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!account) {
      return c.json(
        { error: "not_found", message: "Akun tidak ditemukan", statusCode: 404 },
        404
      );
    }

    if (account.passwordHash.startsWith("$argon2")) {
      return c.json(
        {
          error: "unsupported_hash",
          message:
            "Akun ini masih memakai format kata sandi lama yang tidak dapat diverifikasi di server. Minta Admin mereset kata sandi Anda terlebih dahulu.",
          statusCode: 400,
        },
        400
      );
    }

    const valid = await verifyPassword(currentPassword, account.passwordHash);
    if (!valid) {
      return c.json(
        { error: "bad_request", message: "Kata sandi lama salah", statusCode: 400 },
        400
      );
    }

    if (newPassword === currentPassword) {
      return c.json(
        {
          error: "bad_request",
          message: "Kata sandi baru tidak boleh sama dengan kata sandi lama",
          statusCode: 400,
        },
        400
      );
    }

    const newHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, account.id));

    await db.insert(auditLogs).values({
      userId: payload.sub,
      action: "update",
      tableName: "users",
      recordId: account.id,
      // Sengaja tanpa oldValue/newValue: hash sandi tidak boleh masuk log.
      newValue: { field: "password_hash", reason: "ganti sandi mandiri" },
      ipAddress: c.req.header("cf-connecting-ip") ?? null,
    });

    return c.json({ data: { success: true } });
  }
);
