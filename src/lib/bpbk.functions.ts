import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Default threshold rekomendasi per level (dapat di-override oleh input).
const DEFAULT_THRESHOLDS = {
  1: { alfa: 3, telat: 5 },
  2: { alfa: 6, telat: 10 },
  3: { alfa: 10, telat: 15 },
} as const;

type ThresholdInput = {
  /** Tanggal mulai (YYYY-MM-DD) perhitungan ambang untuk periode berjalan. */
  mulaiTanggal?: string | null;
  sp1Alfa?: number;
  sp1Telat?: number;
  sp2Alfa?: number;
  sp2Telat?: number;
  sp3Alfa?: number;
  sp3Telat?: number;
};

async function fetchAll<T>(query: any, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}


export const getBpBkData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ThresholdInput | undefined) => input ?? {})
  .handler(async ({ context, data: input }) => {
    const sb = context.supabase;
    const THRESHOLDS = {
      1: {
        alfa: Number.isFinite(input.sp1Alfa) ? Number(input.sp1Alfa) : DEFAULT_THRESHOLDS[1].alfa,
        telat: Number.isFinite(input.sp1Telat) ? Number(input.sp1Telat) : DEFAULT_THRESHOLDS[1].telat,
      },
      2: {
        alfa: Number.isFinite(input.sp2Alfa) ? Number(input.sp2Alfa) : DEFAULT_THRESHOLDS[2].alfa,
        telat: Number.isFinite(input.sp2Telat) ? Number(input.sp2Telat) : DEFAULT_THRESHOLDS[2].telat,
      },
      3: {
        alfa: Number.isFinite(input.sp3Alfa) ? Number(input.sp3Alfa) : DEFAULT_THRESHOLDS[3].alfa,
        telat: Number.isFinite(input.sp3Telat) ? Number(input.sp3Telat) : DEFAULT_THRESHOLDS[3].telat,
      },
    };

    const [students, rombelRows, lateRows, attendDetails, attendRecords, spRows] = await Promise.all([
      fetchAll<any>(sb.from("students").select("id, name, nis, rombel_id").order("name")),
      fetchAll<any>(sb.from("rombel").select("id, name, konsentrasi_keahlian")),
      fetchAll<any>(sb.from("late_records").select("student_id, record_date")),
      // Only alfa rows are needed — fetching every attendance detail (80k+ rows)
      // made this page hang for minutes.
      fetchAll<any>(
        sb
          .from("attendance_details")
          .select("student_id, status, attendance_record_id")
          .in("status", ["A", "a", "alfa", "Alfa", "ALFA"]),
        5000,
      ),
      fetchAll<any>(sb.from("attendance_records").select("id, date"), 5000),

      fetchAll<any>(
        sb.from("sp_records").select(
          "id, student_id, sp_level, alasan, jumlah_alfa, jumlah_terlambat, dokumen_pendukung, tanggal_rekaman, created_at",
        ),
      ),
    ]);

    const rMap = new Map<string, any>((rombelRows ?? []).map((r: any) => [r.id, r]));
    const arDateMap = new Map<string, string>((attendRecords ?? []).map((a: any) => [a.id, a.date]));

    // Build per-student event lists with dates
    const alfaByStudent = new Map<string, string[]>();
    for (const a of attendDetails) {
      const st = (a.status ?? "").toString().toLowerCase();
      if (st !== "a" && st !== "alfa") continue;
      const d = arDateMap.get(a.attendance_record_id);
      if (!d || !a.student_id) continue;
      const arr = alfaByStudent.get(a.student_id) ?? [];
      arr.push(d);
      alfaByStudent.set(a.student_id, arr);
    }
    const telatByStudent = new Map<string, string[]>();
    for (const l of lateRows) {
      if (!l.student_id || !l.record_date) continue;
      const arr = telatByStudent.get(l.student_id) ?? [];
      arr.push(l.record_date);
      telatByStudent.set(l.student_id, arr);
    }

    // Existing SP levels + dates per student
    const spByStudent = new Map<string, Set<number>>();
    const spDateByStudent = new Map<string, Record<number, string>>();
    for (const s of spRows) {
      if (!s.student_id) continue;
      const lv = Number(s.sp_level);
      const set = spByStudent.get(s.student_id) ?? new Set<number>();
      set.add(lv);
      spByStudent.set(s.student_id, set);
      const dates = spDateByStudent.get(s.student_id) ?? {};
      const cur = dates[lv];
      const d = s.tanggal_rekaman as string | null;
      // Keep the latest date per level (in case of duplicates)
      if (d && (!cur || d > cur)) dates[lv] = d;
      spDateByStudent.set(s.student_id, dates);
    }

    // Tanggal mulai periode berjalan: kejadian sebelum tanggal ini diabaikan.
    const periodStart =
      typeof input.mulaiTanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.mulaiTanggal)
        ? input.mulaiTanggal
        : null;

    const countSince = (dates: string[] | undefined, cutoff: string | undefined) => {
      if (!dates) return 0;
      let n = 0;
      for (const d of dates) {
        if (periodStart && d < periodStart) continue;
        if (cutoff && d <= cutoff) continue;
        n++;
      }
      return n;
    };


    const baseEnrich = (s: any) => {
      const r = s.rombel_id ? rMap.get(s.rombel_id) : null;
      return {
        id: s.id,
        name: s.name ?? "—",
        nis: s.nis ?? "—",
        rombel_id: s.rombel_id ?? null,
        rombel_name: r?.name ?? "—",
        konsentrasi: r?.konsentrasi_keahlian ?? "—",
      };
    };

    // Recommendations — for SP2/SP3 count only alfa/telat AFTER the previous SP date
    const rekomendasi: Record<1 | 2 | 3, any[]> = { 1: [], 2: [], 3: [] };
    for (const s of students) {
      const hasSp = spByStudent.get(s.id) ?? new Set<number>();
      const spDates = spDateByStudent.get(s.id) ?? {};
      const alfaDates = alfaByStudent.get(s.id);
      const telatDates = telatByStudent.get(s.id);
      for (const lv of [1, 2, 3] as const) {
        if (hasSp.has(lv)) continue;
        if (lv > 1 && !hasSp.has((lv - 1) as 1 | 2)) continue;
        const cutoff = lv === 1 ? undefined : spDates[lv - 1];
        const alfa = countSince(alfaDates, cutoff);
        const telat = countSince(telatDates, cutoff);
        const th = THRESHOLDS[lv];
        if (alfa <= th.alfa && telat <= th.telat) continue;
        rekomendasi[lv].push({ ...baseEnrich(s), alfa, telat, sejak: cutoff ?? null });
      }
    }

    // Existing SP records enriched
    const sMap = new Map<string, any>(students.map((s: any) => [s.id, s]));
    const spEnriched = spRows.map((r: any) => {
      const st = r.student_id ? sMap.get(r.student_id) : null;
      const rb = st?.rombel_id ? rMap.get(st.rombel_id) : null;
      return {
        id: r.id,
        student_id: r.student_id,
        sp_level: Number(r.sp_level),
        alasan: r.alasan ?? "",
        jumlah_alfa: Number(r.jumlah_alfa ?? 0),
        jumlah_terlambat: Number(r.jumlah_terlambat ?? 0),
        dokumen_pendukung: r.dokumen_pendukung ?? null,
        tanggal_rekaman: r.tanggal_rekaman,
        created_at: r.created_at,
        student_name: st?.name ?? "—",
        student_nis: st?.nis ?? "—",
        rombel_id: st?.rombel_id ?? null,
        rombel_name: rb?.name ?? "—",
        konsentrasi: rb?.konsentrasi_keahlian ?? "—",
      };
    });

    const murid: Record<1 | 2 | 3, any[]> = {
      1: spEnriched.filter((x) => x.sp_level === 1).sort((a, b) => a.student_name.localeCompare(b.student_name)),
      2: spEnriched.filter((x) => x.sp_level === 2).sort((a, b) => a.student_name.localeCompare(b.student_name)),
      3: spEnriched.filter((x) => x.sp_level === 3).sort((a, b) => a.student_name.localeCompare(b.student_name)),
    };

    const rombelList = (rombelRows ?? [])
      .map((r: any) => ({ id: r.id, name: r.name, konsentrasi: r.konsentrasi_keahlian ?? "—" }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    return {
      counts: {
        rek1: rekomendasi[1].length,
        murid1: murid[1].length,
        rek2: rekomendasi[2].length,
        murid2: murid[2].length,
        rek3: rekomendasi[3].length,
        murid3: murid[3].length,
      },
      rekomendasi,
      murid,
      rombelList,
      thresholds: THRESHOLDS,
    };
  });
