import { neon } from "@neondatabase/serverless";
import { requireDatabaseUrl } from "./load-database-url";

/**
 * Tukar balik NAMA murid yang tertukar antar dua NISN.
 *
 * Kasus 14 Agustus 2026 (7A - Nur Khasanah): saat impor awal, nama HAXI
 * SATRIYA MUKTI dan KHAILA CAHAYA ZAHRA tertempel pada NISN yang salah.
 * Diverifikasi terhadap pangkalan data NISN resmi Kemendikbud:
 * NISN 3132934941 adalah HAXI SATRIYA MUKTI (L, Wonosobo 9 Februari 2013).
 *
 * Cara pakai:
 *   npm run db:fix-nama-tertukar            -> DRY RUN. Tidak menulis apa pun.
 *   npm run db:fix-nama-tertukar -- --apply  -> menulis perubahan.
 *
 * ================== KENAPA NAMA YANG DITUKAR, BUKAN NISN ==================
 *
 * Godaan pertama adalah menukar kolom `nisn`-nya. JANGAN. Alasannya:
 *
 * 1. NISN adalah identitas login. Email akun dibuat dari NISN
 *    (nisnToEmail -> "<nisn>@siswa.internal") dan kata sandi awal juga NISN.
 *    Menukar students.nisn saja akan membuat murid tidak bisa masuk, karena
 *    users.email tidak ikut berubah. Perbaikannya jadi merembet ke tiga
 *    kolom di dua tabel.
 *
 * 2. Lebih penting: RIWAYAT JURNAL MENEMPEL PADA BARIS, BUKAN PADA NAMA.
 *    Haxi selama ini masuk memakai NISN aslinya (3132934941), jadi semua
 *    jurnal yang dia tulis sudah tersimpan di baris ber-NISN 3132934941 -
 *    baris yang kebetulan salah label nama. Dengan menukar NAMA-nya, jurnal
 *    itu otomatis kembali menjadi milik Haxi. Kalau justru NISN yang ditukar,
 *    jurnal karya Haxi akan tetap tertinggal di akun Khaila dan riwayat dua
 *    murid ini rusak permanen.
 *
 * Jadi skrip ini HANYA menyentuh students.full_name dan students.gender.
 * Tidak ada perubahan pada nisn, users.email, maupun password_hash - murid
 * tetap masuk memakai NISN dan kata sandi yang sama seperti kemarin.
 *
 * ============================== PENGAMAN ==============================
 *
 * Skrip menolak berjalan kecuali kondisi di database persis seperti yang
 * diharapkan: kedua NISN ada, dan himpunan nama yang tersimpan sama persis
 * dengan himpunan nama yang benar (hanya posisinya yang tertukar). Kalau
 * ternyata salah satu baris memuat nama orang ketiga, skrip berhenti - lebih
 * baik gagal daripada menimpa data murid lain.
 *
 * Skrip ini idempoten: menjalankannya dua kali tidak mengubah apa pun pada
 * kali kedua, karena nama sudah cocok.
 */

/** Kebenaran menurut pangkalan data NISN resmi. Tambahkan pasangan lain di sini bila perlu. */
const PASANGAN_BENAR: { nisn: string; fullName: string; gender: "L" | "P" }[][] = [
  [
    { nisn: "3132934941", fullName: "HAXI SATRIYA MUKTI", gender: "L" },
    { nisn: "0133055645", fullName: "KHAILA CAHAYA ZAHRA", gender: "P" },
  ],
];

interface StudentRow {
  id: string;
  nisn: string;
  full_name: string;
  gender: string | null;
  class_name: string;
  jumlah_jurnal: number;
  jumlah_ortu: number;
  wali: string | null;
}

function pad(value: unknown, width: number): string {
  const text = String(value ?? "-");
  return text.length > width ? text.slice(0, width - 1) + "…" : text.padEnd(width);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const databaseUrl = requireDatabaseUrl();
  const sql = neon(databaseUrl);

  console.log(
    apply
      ? "\nMODE: --apply (PERUBAHAN AKAN DITULIS)\n"
      : "\nMODE: dry run (tidak ada yang ditulis). Tambahkan --apply untuk menyimpan.\n"
  );

  interface Perubahan {
    studentId: string;
    nisn: string;
    namaLama: string;
    genderLama: string | null;
    namaBaru: string;
    genderBaru: "L" | "P";
  }
  const perubahan: Perubahan[] = [];

  for (const pasangan of PASANGAN_BENAR) {
    const daftarNisn = pasangan.map((p) => p.nisn);

    // Sekalian tarik jumlah jurnal, jumlah orang tua tertaut, dan nama Guru
    // Wali - supaya terlihat jelas riwayat siapa yang sedang dipindahkan.
    const rows = (await sql`
      SELECT
        s.id                                   AS id,
        s.nisn                                 AS nisn,
        s.full_name                            AS full_name,
        s.gender                               AS gender,
        s.class_name                           AS class_name,
        (SELECT count(*)::int FROM journals j       WHERE j.student_id = s.id) AS jumlah_jurnal,
        (SELECT count(*)::int FROM student_parent p WHERE p.student_id = s.id) AS jumlah_ortu,
        (
          SELECT t.full_name
          FROM teacher_student ts
          JOIN teachers t ON t.id = ts.teacher_id
          WHERE ts.student_id = s.id AND ts.unassigned_at IS NULL
          LIMIT 1
        )                                      AS wali
      FROM students s
      WHERE s.nisn = ANY(${daftarNisn})
    `) as StudentRow[];

    if (rows.length !== pasangan.length) {
      const ketemu = rows.map((r) => r.nisn);
      throw new Error(
        `NISN tidak lengkap di database. Diminta ${daftarNisn.join(", ")}, ` +
          `ketemu ${ketemu.join(", ") || "(tidak ada)"}. Skrip dihentikan.`
      );
    }

    // PENGAMAN: himpunan nama tersimpan harus sama persis dengan himpunan
    // nama yang benar. Kalau ada nama asing, berarti asumsi "hanya tertukar"
    // salah dan menulis apa pun berisiko menghapus data murid lain.
    const namaTersimpan = [...rows.map((r) => r.full_name.trim().toUpperCase())].sort();
    const namaBenar = [...pasangan.map((p) => p.fullName)].sort();
    if (JSON.stringify(namaTersimpan) !== JSON.stringify(namaBenar)) {
      throw new Error(
        "Nama di database tidak cocok dengan pasangan yang diharapkan.\n" +
          `  tersimpan : ${namaTersimpan.join(" | ")}\n` +
          `  diharapkan: ${namaBenar.join(" | ")}\n` +
          "Periksa manual dulu. Skrip dihentikan tanpa menulis apa pun."
      );
    }

    console.log("Keadaan sekarang:");
    console.log(
      "  " + pad("NISN", 12) + pad("NAMA TERSIMPAN", 24) + pad("JK", 4) +
        pad("KELAS", 7) + pad("JURNAL", 8) + pad("ORTU", 6) + "WALI"
    );
    for (const r of rows) {
      console.log(
        "  " + pad(r.nisn, 12) + pad(r.full_name, 24) + pad(r.gender, 4) +
          pad(r.class_name, 7) + pad(r.jumlah_jurnal, 8) + pad(r.jumlah_ortu, 6) + (r.wali ?? "-")
      );
    }

    console.log("\nMenjadi:");
    for (const benar of pasangan) {
      const row = rows.find((r) => r.nisn === benar.nisn)!;
      const berubah =
        row.full_name.trim().toUpperCase() !== benar.fullName || row.gender !== benar.gender;

      console.log(
        "  " + pad(benar.nisn, 12) + pad(row.full_name, 24) + " -> " +
          pad(benar.fullName, 24) + pad(benar.gender, 4) + (berubah ? "(diubah)" : "(sudah benar)")
      );

      if (!berubah) continue;
      perubahan.push({
        studentId: row.id,
        nisn: row.nisn,
        namaLama: row.full_name,
        genderLama: row.gender,
        namaBaru: benar.fullName,
        genderBaru: benar.gender,
      });
    }
    console.log("");
  }

  if (perubahan.length === 0) {
    console.log("Tidak ada yang perlu diubah - semua nama sudah benar.");
    return;
  }

  console.log(
    "CATATAN: kolom nisn, users.email, dan password_hash TIDAK disentuh.\n" +
      "Murid tetap masuk memakai NISN yang sama, dan riwayat jurnal ikut\n" +
      "berpindah ke pemilik yang benar karena jurnal menempel pada baris murid.\n"
  );

  if (!apply) {
    console.log(
      `Dry run selesai. ${perubahan.length} baris AKAN diubah.\n\n` +
        "Untuk benar-benar menulis:\n" +
        "  1. Ambil dump database (atau buat branch Neon) terlebih dulu.\n" +
        "  2. Jalankan: npm run db:fix-nama-tertukar -- --apply"
    );
    return;
  }

  // Satu transaksi lewat satu permintaan HTTP - semua berhasil atau semua
  // batal. Driver neon-http tidak mendukung transaksi interaktif.
  // user_id NULL pada audit: ini pemeliharaan lewat skrip, bukan aksi pengguna.
  await sql.transaction(
    perubahan.flatMap((c) => [
      sql`
        UPDATE students
        SET full_name = ${c.namaBaru}, gender = ${c.genderBaru}
        WHERE id = ${c.studentId}
      `,
      sql`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value)
        VALUES (
          NULL,
          'fix_nama_tertukar',
          'students',
          ${c.studentId},
          ${JSON.stringify({ fullName: c.namaLama, gender: c.genderLama, nisn: c.nisn })}::jsonb,
          ${JSON.stringify({ fullName: c.namaBaru, gender: c.genderBaru, nisn: c.nisn })}::jsonb
        )
      `,
    ])
  );
  console.log(
    `Selesai. ${perubahan.length} baris students diperbarui, ` +
      `${perubahan.length} baris audit_logs ditulis (action = 'fix_nama_tertukar').`
  );
}

main().catch((err) => {
  console.error("Perbaikan gagal:", (err as Error).message);
  process.exit(1);
});
