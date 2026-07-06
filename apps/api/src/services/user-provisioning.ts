import { eq } from "drizzle-orm";
import { hashPassword } from "@sjk/shared";
import type { Role } from "@sjk/shared";
import { users, roles } from "../db/schema";
import type { Database } from "../db/client";

/**
 * Mengambil id baris `roles` berdasarkan nama. Tabel `roles` diisi sekali
 * lewat seed awal (lihat docs/setup-lokal.md) dan dianggap tidak berubah
 * setelah itu, sehingga aman di-query berulang tanpa cache di layer ini.
 */
export async function getRoleId(db: Database, roleName: Role): Promise<string> {
  const [row] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, roleName)).limit(1);

  if (!row) {
    throw new Error(
      `Role '${roleName}' belum terdaftar di tabel roles. Jalankan seed awal (docs/setup-lokal.md).`
    );
  }

  return row.id;
}

/**
 * Membuat baris `users` baru dengan password yang sudah di-hash.
 *
 * CATATAN PENTING (batasan Neon HTTP driver): pembuatan user di sini dan
 * pembuatan baris profil (teachers/students/parents) di masing-masing route
 * pemanggil TIDAK dibungkus dalam satu transaksi database. Driver HTTP Neon
 * tidak mendukung transaksi interaktif lintas-statement dengan logic
 * bercabang. Jika insert profil gagal setelah user berhasil dibuat, route
 * pemanggil WAJIB menghapus user yang baru dibuat (kompensasi manual, bukan
 * rollback otomatis) - lihat pola di routes/teachers.ts, routes/students.ts.
 */
export async function createUserAccount(
  db: Database,
  params: { email: string; plainPassword: string; roleName: Role }
) {
  const roleId = await getRoleId(db, params.roleName);
  const passwordHash = await hashPassword(params.plainPassword);

  const [user] = await db
    .insert(users)
    .values({
      email: params.email.toLowerCase(),
      passwordHash,
      roleId,
    })
    .returning();

  return user;
}

export async function deleteUserAccount(db: Database, userId: string) {
  await db.delete(users).where(eq(users.id, userId));
}
