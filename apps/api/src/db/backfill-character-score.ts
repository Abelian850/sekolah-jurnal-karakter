import { neon } from "@neondatabase/serverless";
import { computeCharacterScore } from "@sjk/shared";
import { requireDatabaseUrl } from "./load-database-url";

/**
 * Hitung ulang verifications.character_score untuk data yang SUDAH ADA,
 * memakai rumus baru (revisi Juli 2026 tahap 3: item "Beribadah" tidak
 * diskor - lihat packages/shared/src/character-score.ts).
 *
 * Cara pakai:
 *   npm run db:backfill-score           -> DRY RUN. Tidak menulis apa pun.
 *   npm run db:backfill-score -- --apply -> menulis perubahan.
 *
 * WAJIB sebelum --apply: ambil dump database (atau branch Neon). Skrip ini
 * mengubah nilai murid yang sudah terlanjur diumumkan.
 *
 * PENGAMAN UTAMA (temuan 31 Juli 2026): skrip hanya menyentuh baris yang
 * nilai tersimpannya SAMA PERSIS dengan hasil rumus lama. Lihat alasan
 * lengkapnya di computeLegacyCharacterScore di bawah - singkatnya, sebagian
 * besar nilai lama ternyata DIKETIK GURU, bukan dihitung mesin, dan menimpa
 * angka seperti itu berarti menghapus penilaian manusia.
 *
 * Catatan penting yang TIDAK ditangani skrip ini (sengaja):
 * - Teks notifikasi lama (notifications.message) memuat angka nilai sebagai
 *   string mati, mis. "...disetujui ... dengan nilai karakter 93". Skrip ini
 *   TIDAK menyuntingnya. Menulis ulang pesan yang sudah dibaca orang adalah
 *   keputusan tersendiri - kalau memang mau, kerjakan terpisah dan sadar.
 *   Konsekuensinya: notifikasi lama bisa menyebut angka yang berbeda dari
 *   riwayat jurnal. Perbaikan strukturalnya adalah berhenti menaruh angka di
 *   teks notifikasi, bukan menambal data lama.
 *
 * Skrip ini idempoten: menjalankannya dua kali tidak mengubah apa-apa pada
 * kali kedua, karena baris yang sudah sama akan terhitung "tetap".
 */

interface ItemRow {
  verification_id: string;
  character_score: number;
  student_name: string;
  class_name: string;
  // Kolom `date` di Postgres dikembalikan driver sebagai objek Date, BUKAN
  // string. Jangan perlakukan sebagai string tanpa melewati toDateText().
  journal_date: string | Date;
  item_name: string;
  status: string;
}

interface Change {
  verificationId: string;
  studentName: string;
  className: string;
  journalDate: string;
  oldScore: number;
  newScore: number | null;
}

interface Skipped {
  studentName: string;
  className: string;
  journalDate: string;
  storedScore: number;
  legacyScore: number | null;
}

/**
 * Rumus SEBELUM revisi Juli 2026 tahap 3: proporsi item "selesai" terhadap
 * SELURUH item jurnal, tanpa pengecualian apa pun.
 *
 * Fungsi ini SENGAJA diduplikasi di sini dan SENGAJA dibekukan - ia tidak
 * boleh ikut berubah kalau rumus hidup di @sjk/shared berubah lagi. Tugasnya
 * hanya satu: mengenali baris mana yang dulu dihitung mesin.
 *
 * Kenapa ini perlu (temuan 31 Juli 2026): dari 14 verifikasi bernilai di
 * basis data produksi, 12 di antaranya TIDAK cocok dengan rumus mana pun -
 * angka itu diketik langsung oleh Guru Wali pada versi aplikasi sebelumnya,
 * ketika characterScore masih dikirim klien. Satu murid diberi 70 oleh
 * gurunya sementara rumus menghasilkan 29; murid lain diberi 100 sementara
 * rumus menghasilkan 57. Menghitung ulang baris seperti itu bukan
 * "memperbaiki data", melainkan MENGHAPUS keputusan penilaian manusia yang
 * sudah dilihat murid dan orang tuanya.
 *
 * Karena itu: hanya baris yang nilai tersimpannya sama persis dengan hasil
 * fungsi ini yang boleh disentuh. Kesamaan itu satu-satunya bukti bahwa
 * angkanya buatan mesin, bukan penilaian guru.
 */
function computeLegacyCharacterScore(items: Array<{ status: string }>): number | null {
  if (items.length === 0) return null;
  const points = items.reduce(
    (acc, it) => acc + (it.status === "selesai" ? 1 : it.status === "sebagian" ? 0.5 : 0),
    0
  );
  return Math.max(1, Math.round((points / items.length) * 100));
}

/**
 * Tanggal jurnal sebagai teks YYYY-MM-DD.
 *
 * Sengaja memakai getFullYear/getMonth/getDate (waktu lokal), BUKAN
 * toISOString(). Kolom `date` diurai driver menjadi Date pada tengah malam
 * waktu lokal; di zona WIB (UTC+7), toISOString() akan menggeser tanggalnya
 * mundur satu hari - 2026-07-24 tampil sebagai 2026-07-23.
 */
function toDateText(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value ?? "");
}

/** Menerima unknown karena nilai dari driver belum tentu string. */
function pad(value: unknown, width: number): string {
  const text = String(value ?? "");
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

  // Satu query, lalu dikelompokkan di JS. Tabel verifikasi sekolah ini
  // berukuran ratusan-ribuan baris, bukan jutaan - tidak perlu paginasi.
  const rows = (await sql`
    SELECT
      v.id              AS verification_id,
      v.character_score AS character_score,
      s.full_name       AS student_name,
      s.class_name      AS class_name,
      j.journal_date    AS journal_date,
      jti.item_name     AS item_name,
      ji.status         AS status
    FROM verifications v
    JOIN journals j              ON j.id  = v.journal_id
    JOIN students s              ON s.id  = j.student_id
    JOIN journal_items ji        ON ji.journal_id = j.id
    JOIN journal_template_items jti ON jti.id = ji.template_item_id
    WHERE v.character_score IS NOT NULL
    ORDER BY s.full_name, j.journal_date
  `) as ItemRow[];

  if (rows.length === 0) {
    console.log("Tidak ada verifikasi bernilai karakter. Tidak ada yang perlu dihitung ulang.");
    return;
  }

  // Kelompokkan item per verifikasi (Map menjaga urutan hasil ORDER BY).
  const grouped = new Map<string, { meta: ItemRow; items: ItemRow[] }>();
  for (const row of rows) {
    const entry = grouped.get(row.verification_id);
    if (entry) entry.items.push(row);
    else grouped.set(row.verification_id, { meta: row, items: [row] });
  }

  const changes: Change[] = [];
  const skipped: Skipped[] = [];
  let unchanged = 0;

  for (const [verificationId, { meta, items }] of grouped) {
    const newScore = computeCharacterScore(
      items.map((it) => ({ itemName: it.item_name, status: it.status }))
    );

    // URUTAN PENTING: periksa "sudah benar" LEBIH DULU, sebelum menanyakan
    // asal-usul angkanya. Kalau dibalik, baris yang baru saja ditulis skrip
    // ini akan gagal dicocokkan dengan rumus lama pada eksekusi berikutnya,
    // lalu salah dicap "nilai guru" - dan ikut terkunci dari perhitungan
    // ulang di masa depan. Itu benar-benar terjadi pada eksekusi 31 Juli
    // 2026 sebelum urutan ini diperbaiki.
    if (newScore === meta.character_score) {
      unchanged += 1;
      continue;
    }

    // PENGAMAN: nilai yang tidak cocok dengan rumus mana pun berarti diketik
    // Guru Wali - biarkan apa adanya, selamanya.
    const legacyScore = computeLegacyCharacterScore(items);
    if (legacyScore !== meta.character_score) {
      skipped.push({
        studentName: meta.student_name,
        className: meta.class_name,
        journalDate: toDateText(meta.journal_date),
        storedScore: meta.character_score,
        legacyScore,
      });
      continue;
    }
    changes.push({
      verificationId,
      studentName: meta.student_name,
      className: meta.class_name,
      journalDate: toDateText(meta.journal_date),
      oldScore: meta.character_score,
      newScore,
    });
  }

  if (skipped.length > 0) {
    console.log("DILEWATI — nilai diketik Guru Wali, TIDAK akan disentuh:\n");
    console.log(
      `${pad("MURID", 28)}${pad("KELAS", 8)}${pad("TANGGAL", 12)}${pad("TERSIMPAN", 11)}RUMUS LAMA`
    );
    console.log("-".repeat(72));
    for (const s of skipped) {
      console.log(
        `${pad(s.studentName, 28)}${pad(s.className, 8)}${pad(s.journalDate, 12)}${pad(String(s.storedScore), 11)}${s.legacyScore ?? "-"}`
      );
    }
    console.log("");
  }

  console.log("AKAN DIUBAH — nilai hasil hitungan mesin:\n");
  console.log(
    `${pad("MURID", 28)}${pad("KELAS", 8)}${pad("TANGGAL", 12)}${pad("LAMA", 6)}${pad("BARU", 6)}SELISIH`
  );
  console.log("-".repeat(72));
  for (const c of changes) {
    const baru = c.newScore === null ? "NULL" : String(c.newScore);
    const selisih = c.newScore === null ? "-" : `${c.newScore - c.oldScore > 0 ? "+" : ""}${c.newScore - c.oldScore}`;
    console.log(
      `${pad(c.studentName, 28)}${pad(c.className, 8)}${pad(c.journalDate, 12)}${pad(String(c.oldScore), 6)}${pad(baru, 6)}${selisih}`
    );
  }

  console.log("-".repeat(72));
  console.log(`Total verifikasi diperiksa   : ${grouped.size}`);
  console.log(`Dilewati (nilai guru)        : ${skipped.length}`);
  console.log(`Nilai berubah                : ${changes.length}`);
  console.log(`Nilai tetap                  : ${unchanged}`);

  const toNull = changes.filter((c) => c.newScore === null).length;
  if (toNull > 0) {
    console.log(
      `\nPERHATIAN: ${toNull} verifikasi jadi NULL karena jurnalnya tidak punya item` +
        ` yang diskor sama sekali. Periksa templatenya sebelum --apply.`
    );
  }

  if (changes.length === 0) {
    console.log("\nTidak ada yang perlu ditulis.");
    return;
  }

  if (!apply) {
    console.log(
      "\nDry run selesai. Periksa tabel di atas. Kalau sudah yakin:" +
        "\n  1. Ambil dump database terlebih dulu." +
        "\n  2. Jalankan: npm run db:backfill-score -- --apply"
    );
    return;
  }

  // sql.transaction() mengirim seluruh pernyataan dalam SATU transaksi lewat
  // satu permintaan HTTP - semua berhasil atau semua batal. Driver neon-http
  // tidak mendukung transaksi interaktif, jadi seluruh nilai memang harus
  // dihitung lebih dulu di atas (dan itu memang yang kita lakukan).
  const statements = changes.flatMap((c) => [
    sql`UPDATE verifications SET character_score = ${c.newScore} WHERE id = ${c.verificationId}`,
    // userId sengaja NULL: perubahan ini dilakukan skrip pemeliharaan, bukan
    // oleh seorang pengguna. Kolomnya nullable, jadi jejaknya tetap tercatat.
    sql`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value)
      VALUES (
        NULL,
        'backfill_character_score',
        'verifications',
        ${c.verificationId},
        ${JSON.stringify({ characterScore: c.oldScore })}::jsonb,
        ${JSON.stringify({ characterScore: c.newScore })}::jsonb
      )
    `,
  ]);

  await sql.transaction(statements);
  console.log(
    `\nSelesai. ${changes.length} nilai diperbarui, ${changes.length} baris audit_logs ditulis` +
      ` (action = 'backfill_character_score').`
  );
}

main().catch((err) => {
  console.error("Backfill gagal:", err);
  process.exit(1);
});
