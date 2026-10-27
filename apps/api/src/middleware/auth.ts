import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import type { AppJwtPayload } from "@sjk/shared";
import type { Env, Variables } from "../index";

/**
 * Middleware autentikasi: memverifikasi Bearer JWT yang diterbitkan oleh
 * Auth.js di apps/web (strategy: "jwt", signed dengan AUTH_SECRET).
 * Kedua sisi (web & api) WAJIB memakai AUTH_SECRET yang identik.
 *
 * Setelah lolos verifikasi, payload disimpan di context (`c.set("user", payload)`)
 * agar bisa dipakai oleh middleware RBAC dan route handler berikutnya.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        { error: "unauthorized", message: "Header Authorization Bearer diperlukan", statusCode: 401 },
        401
      );
    }

    const token = authHeader.slice("Bearer ".length);
    const secret = new TextEncoder().encode(c.env.AUTH_SECRET);

    try {
      const { payload } = await jwtVerify(token, secret);
      c.set("user", payload as unknown as AppJwtPayload);
      await next();
    } catch (err) {
      return c.json(
        { error: "unauthorized", message: "Token tidak valid atau kedaluwarsa", statusCode: 401 },
        401
      );
    }
  }
);
