import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Hashing password dengan argon2id via WASM murni (bukan native Node addon).
 *
 * Catatan pasca-migrasi ke @opennextjs/cloudflare (lihat docs/deployment.md):
 * apps/web kini berjalan di runtime Node.js penuh (nodejs_compat), sehingga
 * secara teknis native addon seperti `@node-rs/argon2` sudah bisa dipakai
 * lagi di sana. Tapi `hash-wasm` tetap dipertahankan dengan sengaja, karena:
 * 1. apps/api (Cloudflare Workers untuk Hono) TETAP tidak mendukung native
 *    addon - jadi tetap butuh implementasi WASM/pure-JS di sana.
 * 2. Memakai SATU implementasi yang sama di kedua sisi (packages/shared)
 *    lebih mudah dipelihara daripada dua implementasi berbeda yang harus
 *    menghasilkan hash yang saling kompatibel.
 */

const SALT_LENGTH = 16;

function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export async function hashPassword(plain: string): Promise<string> {
  return argon2id({
    password: plain,
    salt: randomSalt(),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456, // ~19 MB, sesuai rekomendasi OWASP untuk argon2id
    hashLength: 32,
    outputType: "encoded", // menghasilkan string PHC ($argon2id$v=19$...) siap disimpan
  });
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    return await argon2Verify({ password: plain, hash: hashed });
  } catch {
    return false;
  }
}
