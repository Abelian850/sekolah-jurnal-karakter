import { Hono } from "hono";
import { PERMISSIONS, ROLES } from "@sjk/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { Env, Variables } from "../index";

export const filesRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Upload & penyajian foto bukti jurnal via Cloudflare R2 (JOURNAL_BUCKET).
 *
 * Alur: browser -> server action Next.js (multipart) -> POST /files/journal-photo
 * -> R2. Foto disajikan kembali lewat GET /files/journal/* yang diproksi
 * oleh route handler apps/web/app/api/foto/[...key]/route.ts (browser tidak
 * bisa mengirim Bearer token pada <img>/<a>, jadi proxy memakai cookie sesi).
 *
 * Nilai yang disimpan di journal_items.photo_url adalah PATH RELATIF web
 * ("/api/foto/journal/..."), bukan URL R2 langsung - bucket tetap privat.
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB - selaras dengan kompresi klien
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// POST /files/journal-photo - Peserta Didik mengunggah foto bukti.
filesRoute.post(
  "/journal-photo",
  authMiddleware,
  requirePermission(PERMISSIONS.JOURNAL_FILL),
  async (c) => {
    const user = c.get("user");
    if (!user.schoolId) {
      return c.json(
        { error: "forbidden", message: "Akun tidak terkait sekolah", statusCode: 403 },
        403
      );
    }

    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json(
        { error: "bad_request", message: "Field 'file' (multipart) diperlukan", statusCode: 400 },
        400
      );
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return c.json(
        {
          error: "unsupported_media_type",
          message: "Format foto harus JPG, PNG, atau WebP",
          statusCode: 415,
        },
        415
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json(
        { error: "payload_too_large", message: "Ukuran foto maksimal 5MB", statusCode: 413 },
        413
      );
    }

    // Key: journal/<schoolId>/<userId>/<uuid>.<ext> - schoolId di posisi
    // kedua dipakai GET di bawah untuk otorisasi lintas sekolah.
    const key = `journal/${user.schoolId}/${user.sub}/${crypto.randomUUID()}.${ext}`;
    await c.env.JOURNAL_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    return c.json({ data: { path: `/api/foto/${key}` } }, 201);
  }
);

// GET /files/journal/* - menyajikan foto untuk semua role yang login.
// Lintas sekolah hanya boleh untuk Admin; role lain wajib sekolah yang sama.
filesRoute.get("/journal/*", authMiddleware, async (c) => {
  const user = c.get("user");
  const key = c.req.path.replace(/^\/files\//, "");

  const schoolIdInKey = key.split("/")[1] ?? "";
  if (user.role !== ROLES.ADMIN && user.schoolId !== schoolIdInKey) {
    return c.json(
      { error: "forbidden", message: "Tidak berhak mengakses foto ini", statusCode: 403 },
      403
    );
  }

  const object = await c.env.JOURNAL_BUCKET.get(key);
  if (!object) {
    return c.json({ error: "not_found", message: "Foto tidak ditemukan", statusCode: 404 }, 404);
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=86400",
      ETag: object.httpEtag,
    },
  });
});
