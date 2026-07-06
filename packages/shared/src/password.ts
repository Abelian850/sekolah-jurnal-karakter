import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Hashing password dengan argon2id via WASM murni (bukan native Node addon),
 * agar bisa berjalan konsisten di dua runtime yang berbeda:
 * - apps/web: route handler Auth.js berjalan dengan `runtime = "edge"`
 * - apps/api: Cloudflare Workers (isolate V8, tanpa Node native addon)
 * Library seperti `@node-rs/argon2` TIDAK bisa dipakai di kedua runtime di
 * atas karena bergantung pada native binary. `hash-wasm` murni WASM+JS,
 * sehingga aman dipakai di packages/shared dan diimpor oleh keduanya.
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
