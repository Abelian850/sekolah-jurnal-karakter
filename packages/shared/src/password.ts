/**
 * Hashing password lintas-runtime (Node.js di apps/web, Cloudflare Workers
 * di apps/api).
 *
 * SEJARAH: semula memakai argon2id via `hash-wasm`. Ternyata GAGAL di
 * runtime Workers (wrangler dev maupun produksi) dengan error
 * "WebAssembly.compile(): Wasm code generation disallowed by embedder" -
 * Workers melarang kompilasi WASM dinamis, sedangkan hash-wasm memuat
 * modul WASM-nya lewat WebAssembly.compile saat runtime. Akibatnya semua
 * endpoint yang MEMBUAT akun (teachers/students/parents/principals) mati.
 *
 * SOLUSI: hash baru memakai PBKDF2-SHA256 via WebCrypto (crypto.subtle),
 * yang native di Workers dan Node >= 18. Iterasi dibatasi 100.000 karena
 * itu batas maksimum yang diizinkan crypto.subtle di Cloudflare Workers.
 * PBKDF2 lebih lemah daripada argon2id terhadap serangan GPU, tapi ini
 * satu-satunya KDF native yang tersedia di kedua runtime tanpa WASM.
 *
 * KOMPATIBILITAS MUNDUR: hash argon2 lama (mis. akun admin hasil seed)
 * tetap bisa diverifikasi - verifyPassword mendeteksi prefix hash dan
 * memakai hash-wasm HANYA untuk hash argon2. Verifikasi login hanya
 * terjadi di apps/web (runtime Node penuh), jadi jalur argon2 aman di
 * sana. Kode di apps/api tidak pernah memverifikasi hash argon2.
 */

const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000; // batas maksimum crypto.subtle di Workers
const HASH_LENGTH = 32;
const PBKDF2_PREFIX = "$pbkdf2-sha256$";

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function derivePbkdf2(
  plain: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    // `salt.buffer` selalu ArrayBuffer utuh di sini (Uint8Array dibuat sendiri,
    // bukan subarray). Hindari nama tipe `BufferSource` yang tidak tersedia
    // di lib tsconfig paket shared.
    { name: "PBKDF2", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, iterations },
    keyMaterial,
    HASH_LENGTH * 8
  );
  return new Uint8Array(bits);
}

/** Perbandingan waktu-konstan untuk mencegah timing attack. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const derived = await derivePbkdf2(plain, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}i=${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    if (hashed.startsWith(PBKDF2_PREFIX)) {
      const [, , iterPart, saltB64, hashB64] = hashed.split("$");
      const iterations = Number(iterPart.replace("i=", ""));
      if (!Number.isInteger(iterations) || iterations < 1) return false;
      const derived = await derivePbkdf2(plain, fromBase64(saltB64), iterations);
      return constantTimeEqual(derived, fromBase64(hashB64));
    }

    // Hash lama (argon2id dari hash-wasm). Dynamic import agar modul WASM
    // tidak pernah dievaluasi di runtime Workers - jalur ini hanya dilalui
    // oleh verifikasi login di apps/web (Node.js).
    if (hashed.startsWith("$argon2")) {
      const { argon2Verify } = await import("hash-wasm");
      return await argon2Verify({ password: plain, hash: hashed });
    }

    return false;
  } catch {
    return false;
  }
}
