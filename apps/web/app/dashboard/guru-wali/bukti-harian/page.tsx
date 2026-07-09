import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { formatDateID, getTodayDateWIB } from "@/lib/date";
import {
  EvidenceRequirementForm,
  type TemplateItemOption,
} from "@/components/evidence-requirement-form";

interface EvidenceRequirement {
  id: string;
  requirementDate: string;
  templateItemId: string;
  itemName: string;
}

/**
 * Halaman "Bukti Harian" Guru Wali (7 Kebiasaan Anak Indonesia Hebat):
 * memilih SATU kebiasaan yang wajib disertai foto bukti hari ini untuk
 * semua siswa binaan. Tanggal lain bisa dipilih lewat ?date=YYYY-MM-DD
 * (input date di bawah melakukan navigasi GET biasa).
 */
export default async function BuktiHarianPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = getTodayDateWIB();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;

  let data: { requirement: EvidenceRequirement | null; templateItems: TemplateItemOption[] } | null =
    null;
  let profileMissing = false;
  try {
    data = await apiFetch(`/evidence-requirements?date=${date}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 404) {
      profileMissing = true;
    } else {
      throw err;
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Bukti Harian</h1>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Pilih satu kebiasaan yang wajib disertai foto bukti oleh semua siswa binaan Anda pada
        tanggal ini. Jika tidak dipilih, siswa tetap wajib melampirkan satu foto pada kebiasaan
        mana pun.
      </p>

      <form method="get" className="mb-4 flex items-center gap-2">
        <label htmlFor="date" className="text-sm text-slate-600 dark:text-slate-400">
          Tanggal:
        </label>
        <input
          id="date"
          type="date"
          name="date"
          defaultValue={date}
          className="rounded-lg border border-slate-300 bg-white/80 px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900/80"
        />
        <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          Buka
        </button>
        <span className="text-sm text-slate-500">{formatDateID(date)}</span>
      </form>

      {profileMissing ? (
        <p className="text-sm text-slate-500">
          Profil guru untuk akun ini belum terdaftar. Hubungi Admin sekolah.
        </p>
      ) : data === null || data.templateItems.length === 0 ? (
        <p className="text-sm text-slate-500">
          Template jurnal aktif belum memiliki item. Hubungi Admin sekolah.
        </p>
      ) : (
        <>
          {data.requirement && (
            <p className="mb-2 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-600 dark:bg-brand-900/40 dark:text-brand-500">
              Saat ini: {data.requirement.itemName}
            </p>
          )}
          <EvidenceRequirementForm
            date={date}
            templateItems={data.templateItems}
            currentTemplateItemId={data.requirement?.templateItemId ?? null}
          />
        </>
      )}
    </div>
  );
}
