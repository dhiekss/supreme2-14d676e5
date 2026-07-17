import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Default threshold rekomendasi per level (dapat di-override oleh input).
const DEFAULT_THRESHOLDS = {
  1: { alfa: 3, telat: 5 },
  2: { alfa: 6, telat: 10 },
  3: { alfa: 10, telat: 15 },
} as const;

type ThresholdInput = {
  sp1Alfa?: number;
  sp1Telat?: number;
  sp2Alfa?: number;
  sp2Telat?: number;
  sp3Alfa?: number;
  sp3Telat?: number;
};

async function fetchAll<T>(query: any): Promise<T[]> {
  const pageSize = 1000;
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

export const getBpBkData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;

    const [students, rombelRows, lateRows, attendRows, spRows] = await Promise.all([
      fetchAll<any>(sb.from("students").select("id, name, nis, rombel_id").order("name")),
      fetchAll<any>(sb.from("rombel").select("id, name, konsentrasi_keahlian")),
      fetchAll<any>(sb.from("late_records").select("student_id")),
      fetchAll<any>(sb.from("attendance_details").select("student_id, status")),
      fetchAll<any>(
        sb.from("sp_records").select(
          "id, student_id, sp_level, alasan, jumlah_alfa, jumlah_terlambat, dokumen_pendukung, tanggal_rekaman, created_at",
        ),
      ),
    ]);

    const rMap = new Map<string, any>((rombelRows ?? []).map((r: any) => [r.id, r]));

    // Count alfa & telat per student
    const alfaCount = new Map<string, number>();
    for (const a of attendRows) {
      const st = (a.status ?? "").toString().toLowerCase();
      if (st === "a" || st === "alfa") {
        alfaCount.set(a.student_id, (alfaCount.get(a.student_id) ?? 0) + 1);
      }
    }
    const telatCount = new Map<string, number>();
    for (const l of lateRows) {
      if (!l.student_id) continue;
      telatCount.set(l.student_id, (telatCount.get(l.student_id) ?? 0) + 1);
    }

    // Existing SP levels per student
    const spByStudent = new Map<string, Set<number>>();
    for (const s of spRows) {
      if (!s.student_id) continue;
      const set = spByStudent.get(s.student_id) ?? new Set<number>();
      set.add(Number(s.sp_level));
      spByStudent.set(s.student_id, set);
    }

    const enrichStudent = (s: any) => {
      const r = s.rombel_id ? rMap.get(s.rombel_id) : null;
      return {
        id: s.id,
        name: s.name ?? "—",
        nis: s.nis ?? "—",
        rombel_id: s.rombel_id ?? null,
        rombel_name: r?.name ?? "—",
        konsentrasi: r?.konsentrasi_keahlian ?? "—",
        alfa: alfaCount.get(s.id) ?? 0,
        telat: telatCount.get(s.id) ?? 0,
      };
    };

    // Recommendations
    const rekomendasi: Record<1 | 2 | 3, any[]> = { 1: [], 2: [], 3: [] };
    for (const s of students) {
      const enriched = enrichStudent(s);
      const hasSp = spByStudent.get(s.id) ?? new Set<number>();
      for (const lv of [1, 2, 3] as const) {
        const th = THRESHOLDS[lv];
        const meets = enriched.alfa > th.alfa || enriched.telat > th.telat;
        if (!meets) continue;
        if (hasSp.has(lv)) continue; // already given at this level
        if (lv > 1 && !hasSp.has((lv - 1) as 1 | 2)) continue; // must have previous level
        rekomendasi[lv].push(enriched);
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
