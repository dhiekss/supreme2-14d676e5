import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function fetchAll<T = any>(build: (from: number, to: number) => any, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await build(from, to);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);

    const { data: todayRecords, error: trErr } = await supabase
      .from("attendance_records").select("id").eq("date", today);
    if (trErr) throw new Error(trErr.message);
    const todayRecordIds = (todayRecords ?? []).map((r: any) => r.id);

    const [guru, rombel, studentsAll, presensiTodayAll, lateToday, spActive, loans, rombelAll] = await Promise.all([
      supabase.from("guru").select("*", { count: "exact", head: true }),
      supabase.from("rombel").select("*", { count: "exact", head: true }),
      fetchAll((from, to) => supabase.from("students").select("id, gender, rombel_id").range(from, to)),
      todayRecordIds.length
        ? fetchAll((from, to) => supabase.from("attendance_details").select("status").in("attendance_record_id", todayRecordIds).range(from, to))
        : Promise.resolve([] as any[]),
      supabase.from("late_records").select("*", { count: "exact", head: true }).eq("record_date", today),
      supabase.from("sp_records").select("*", { count: "exact", head: true }),
      supabase.from("book_loans").select("*", { count: "exact", head: true }).eq("status", "dipinjam"),
      fetchAll((from, to) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian").range(from, to)),
    ]);

    const students = { data: studentsAll };
    const presensiToday = { data: presensiTodayAll };
    const rombelRows = { data: rombelAll };



    const rombelById = new Map((rombelRows.data ?? []).map((r: any) => [r.id, r]));
    const tingkatStats: Record<string, { total: number; L: number; P: number }> = {
      X: { total: 0, L: 0, P: 0 },
      XI: { total: 0, L: 0, P: 0 },
      XII: { total: 0, L: 0, P: 0 },
    };
    let totalMurid = 0;
    for (const s of students.data ?? []) {
      const r = s.rombel_id ? rombelById.get(s.rombel_id) : null;
      if (!r) continue; // skip murid tanpa rombel (mis. sisa kelas yang sudah dihapus)
      totalMurid++;
      const t = r?.tingkat;
      if (t && tingkatStats[t]) {
        tingkatStats[t].total++;
        if (s.gender === "L") tingkatStats[t].L++;
        else if (s.gender === "P") tingkatStats[t].P++;
      }
    }

    const details = presensiToday.data ?? [];
    const hadirToday = details.filter((d: any) => d.status === "H").length;
    const totalDetail = details.length;
    const persenHadir = totalDetail ? Math.round((hadirToday / totalDetail) * 100) : 0;

    // per konsentrasi: count students grouped via rombel
    const konsentrasiAgg: Record<string, { total: number }> = {};
    const konsentrasiByRombel: Record<string, string> = {};
    for (const r of rombelRows.data ?? []) {
      konsentrasiByRombel[r.id] = r.konsentrasi_keahlian ?? "Lainnya";
    }
    const perKonsentrasi: Record<string, { total: number }> = {};
    for (const s of students.data ?? []) {
      if (!s.rombel_id || !rombelById.has(s.rombel_id)) continue;
      const k = konsentrasiByRombel[s.rombel_id] || "Lainnya";
      perKonsentrasi[k] = perKonsentrasi[k] || { total: 0 };
      perKonsentrasi[k].total++;
    }

    return {
      guru: guru.count ?? 0,
      murid: totalMurid,
      rombel: rombel.count ?? 0,
      hadirHariIni: hadirToday,
      totalPresensiHariIni: totalDetail,
      persenHadir,
      lateToday: lateToday.count ?? 0,
      spAktif: spActive.count ?? 0,
      bukuDipinjam: loans.count ?? 0,
      tingkat: tingkatStats,
      perKonsentrasi: Object.entries(perKonsentrasi)
        .map(([nama, v]) => ({ nama, total: v.total }))
        .sort((a, b) => b.total - a.total),
    };
  });
