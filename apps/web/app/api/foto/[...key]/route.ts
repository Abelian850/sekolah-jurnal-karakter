import { auth } from "@/lib/auth";
import { mintApiToken } from "@/lib/api-token";

/**
 * Proxy foto bukti jurnal. <img>/<a> di browser tidak bisa mengirim Bearer
 * token, jadi handler ini memakai cookie sesi Auth.js, me-mint token API
 * singkat (pola sama dengan lib/api-client.ts), lalu meneruskan stream dari
 * GET /files/journal/* di backend Hono. Otorisasi sekolah dilakukan di API.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Belum login", { status: 401 });
  }

  const { key } = await params;
  const token = await mintApiToken({
    sub: session.user.id,
    email: session.user.email,
    role: session.user.role,
    schoolId: session.user.schoolId,
  });

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/files/${key.map(encodeURIComponent).join("/")}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!res.ok || !res.body) {
    return new Response("Foto tidak ditemukan", { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
