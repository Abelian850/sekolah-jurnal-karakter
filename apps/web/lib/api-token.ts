import { SignJWT } from "jose";
import type { AppJwtPayload, Role } from "@sjk/shared";

/**
 * PENTING - kenapa file ini ada:
 * Auth.js v5 (strategy: "jwt") secara default menyimpan sesi sebagai JWE
 * (token terenkripsi, bukan sekadar ditandatangani), format yang tidak
 * kompatibel dengan verifikasi sederhana `jose.jwtVerify` di middleware
 * Hono (apps/api/src/middleware/auth.ts).
 *
 * Solusinya: token sesi Next.js (cookie, JWE) dan token API (Bearer, JWT
 * HS256) dipisah. Fungsi ini me-mint token API berumur pendek (5 menit)
 * dari data sesi yang sudah tervalidasi oleh Auth.js, khusus untuk dikirim
 * ke backend Hono. Pola ini umum dipakai ketika frontend dan backend
 * adalah dua layanan terpisah dengan mekanisme sesi yang berbeda.
 */
export async function mintApiToken(payload: {
  sub: string;
  email: string;
  role: Role;
  schoolId: string | null;
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET as string);

  return new SignJWT({
    email: payload.email,
    role: payload.role,
    schoolId: payload.schoolId,
  } satisfies Omit<AppJwtPayload, "sub" | "iat" | "exp">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
}
