import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [guru, rombel, students, presensiToday, lateToday, spActive, loans, rombelRows] = await Promise.all([
      supabase.from("guru").select("*", { count: "exact", head: true }),
      supabase.from("rombel").select("*", { count: "exact", head: true }),
      supabase.from("students").select("id, gender, rombel_id").range(0, 99999),
      supabase.from("attendance_details").select("status, attendance_records!inner(date)").eq("attendance_records.date", today).range(0, 99999),
      supabase.from("late_records").select("*", { count: "exact", head: true }).eq("record_date", today),
      supabase.from("sp_records").select("*", { count: "exact", head: true }),
      supabase.from("book_loans").select("*", { count: "exact", head: true }).eq("status", "dipinjam"),
      supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian").range(0, 9999),
    ]);

    const rombelById = new Map((rombelRows.data ?? []).map((r: any) => [r.id, r]));
    const tingkatStats: Record<string, { total: number; L: number; P: number }> = {
      X: { total: 0, L: 0, P: 0 },
      XI: { total: 0, L: 0, P: 0 },
      XII: { total: 0, L: 0, P: 0 },
    };
    let totalMurid = 0;
    for (const s of students.data ?? []) {
      totalMurid++;
      const r = s.rombel_id ? rombelById.get(s.rombel_id) : null;
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
      const k = (s.rombel_id && konsentrasiByRombel[s.rombel_id]) || "Lainnya";
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
