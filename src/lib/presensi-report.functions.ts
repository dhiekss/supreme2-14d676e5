import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const presensiReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid(),
      from: z.string(),
      to: z.string(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: students, error: sErr } = await supabase
      .from("students")
      .select("id, nis, name")
      .eq("rombel_id", data.rombelId)
      .order("name");
    if (sErr) throw new Error(sErr.message);

    const { data: records, error: rErr } = await supabase
      .from("attendance_records")
      .select("id, date")
      .eq("rombel_id", data.rombelId)
      .gte("date", data.from)
      .lte("date", data.to)
      .order("date");
    if (rErr) throw new Error(rErr.message);

    const recordIds = (records ?? []).map((r) => r.id);
    const { data: details } = recordIds.length
      ? await supabase
          .from("attendance_details")
          .select("attendance_record_id, student_id, status")
          .in("attendance_record_id", recordIds)
      : { data: [] as any[] };

    const summary = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    for (const s of students ?? []) summary.set(s.id, { H: 0, S: 0, I: 0, A: 0, P: 0 });
    for (const d of details ?? []) {
      const row = summary.get(d.student_id);
      if (!row) continue;
      const st = d.status as "H" | "S" | "I" | "A" | "P";
      if (st in row) row[st]++;
    }

    return {
      totalDays: (records ?? []).length,
      students: (students ?? []).map((s) => ({
        id: s.id,
        nis: s.nis,
        name: s.name,
        ...(summary.get(s.id) ?? { H: 0, S: 0, I: 0, A: 0, P: 0 }),
      })),
    };
  });

export const presensiDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      from: z.string(),
      to: z.string(),
      konsentrasi: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const [rombelRes, guruRes, studentsRes] = await Promise.all([
      supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").range(0, 9999),
      supabase.from("guru").select("*", { count: "exact", head: true }),
      supabase.from("students").select("id, nis, name, rombel_id").range(0, 99999),
    ]);
    const allRombel = rombelRes.data ?? [];
    const rombel = data.konsentrasi && data.konsentrasi !== "__all"
      ? allRombel.filter((r: any) => r.konsentrasi_keahlian === data.konsentrasi)
      : allRombel;
    const rombelIds = new Set(rombel.map((r: any) => r.id));
    const rombelById = new Map(allRombel.map((r: any) => [r.id, r]));
    const students = (studentsRes.data ?? []).filter((s: any) => s.rombel_id && rombelIds.has(s.rombel_id));
    const studentById = new Map(students.map((s: any) => [s.id, s]));

    const { data: records } = await supabase
      .from("attendance_records")
      .select("id, date, rombel_id")
      .gte("date", data.from)
      .lte("date", data.to)
      .range(0, 99999);
    const recs = (records ?? []).filter((r: any) => r.rombel_id && rombelIds.has(r.rombel_id));
    const recIds = recs.map((r: any) => r.id);
    const recById = new Map(recs.map((r: any) => [r.id, r]));

    const { data: details } = recIds.length
      ? await supabase
          .from("attendance_details")
          .select("attendance_record_id, student_id, status")
          .in("attendance_record_id", recIds)
          .range(0, 999999)
      : { data: [] as any[] };
    const dets = details ?? [];

    // totals
    const totals = { H: 0, S: 0, I: 0, A: 0, P: 0 };
    for (const d of dets) {
      const s = d.status as keyof typeof totals;
      if (s && s in totals) totals[s]++;
    }
    const totalKehadiran = totals.H + totals.S + totals.I + totals.A + totals.P;

    // trends by date
    const dateAgg = new Map<string, { A: number; S: number; I: number; P: number; H: number }>();
    for (const d of dets) {
      const rec = recById.get(d.attendance_record_id);
      if (!rec) continue;
      const dt = String(rec.date);
      if (!dateAgg.has(dt)) dateAgg.set(dt, { A: 0, S: 0, I: 0, P: 0, H: 0 });
      const row = dateAgg.get(dt)!;
      const st = d.status as keyof typeof row;
      if (st in row) row[st]++;
    }
    const trend = [...dateAgg.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    // rombel belum input (in period)
    const rombelWithInput = new Set(recs.map((r: any) => r.rombel_id));
    const rombelBelum = rombel.filter((r: any) => !rombelWithInput.has(r.id));

    // top alfa per student
    const alfaByStudent = new Map<string, number>();
    for (const d of dets) {
      if (d.status !== "A") continue;
      alfaByStudent.set(d.student_id, (alfaByStudent.get(d.student_id) ?? 0) + 1);
    }
    const alfaTop = [...alfaByStudent.entries()]
      .map(([sid, count]) => {
        const s: any = studentById.get(sid);
        if (!s) return null;
        const r: any = rombelById.get(s.rombel_id);
        return { id: sid, nis: s.nis, name: s.name, rombel: r?.name ?? "-", tingkat: r?.tingkat ?? "-", count };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 15);

    // detail per record
    const perRec = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    for (const d of dets) {
      const key = d.attendance_record_id as string;
      if (!perRec.has(key)) perRec.set(key, { H: 0, S: 0, I: 0, A: 0, P: 0 });
      const r = perRec.get(key)!;
      const st = d.status as keyof typeof r;
      if (st in r) r[st]++;
    }
    const detailRows = recs
      .map((r: any) => {
        const rb: any = rombelById.get(r.rombel_id);
        const counts = perRec.get(r.id) ?? { H: 0, S: 0, I: 0, A: 0, P: 0 };
        const total = counts.H + counts.S + counts.I + counts.A + counts.P;
        return {
          id: r.id,
          date: r.date,
          rombel: rb?.name ?? "-",
          walikelas: rb?.wali_kelas_name ?? "-",
          ...counts,
          total,
        };
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 100);

    const konsentrasiList = [...new Set(allRombel.map((r: any) => r.konsentrasi_keahlian).filter(Boolean))] as string[];

    return {
      filter: { from: data.from, to: data.to, konsentrasi: data.konsentrasi ?? "__all" },
      stats: {
        totalKelas: rombel.length,
        totalPengajar: guruRes.count ?? 0,
        totalMurid: students.length,
      },
      totals: {
        sesi: recs.length,
        H: totals.H,
        S: totals.S,
        I: totals.I,
        A: totals.A,
        P: totals.P,
        kehadiran: totalKehadiran,
      },
      trend,
      rombelBelum: rombelBelum.map((r: any) => ({
        id: r.id,
        name: r.name,
        walikelas: r.wali_kelas_name,
        tingkat: r.tingkat,
      })),
      alfaTop,
      detailRows,
      konsentrasiList,
    };
  });

export const rombelBelumInputByDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      date: z.string(),
      tingkat: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const [rombelRes, studentsRes, recordsRes] = await Promise.all([
      supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").range(0, 9999),
      supabase.from("students").select("id, rombel_id").range(0, 99999),
      supabase.from("attendance_records").select("rombel_id").eq("date", data.date).range(0, 9999),
    ]);
    const allRombel = rombelRes.data ?? [];
    const filtered = data.tingkat && data.tingkat !== "__all"
      ? allRombel.filter((r: any) => String(r.tingkat) === String(data.tingkat))
      : allRombel;
    const hasRec = new Set((recordsRes.data ?? []).map((r: any) => r.rombel_id));
    const countByRombel = new Map<string, number>();
    for (const s of studentsRes.data ?? []) {
      if (!s.rombel_id) continue;
      countByRombel.set(s.rombel_id, (countByRombel.get(s.rombel_id) ?? 0) + 1);
    }
    const rows = filtered
      .filter((r: any) => !hasRec.has(r.id))
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        tingkat: r.tingkat,
        walikelas: r.wali_kelas_name ?? "-",
        jumlahMurid: countByRombel.get(r.id) ?? 0,
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const tingkatList = [...new Set(allRombel.map((r: any) => r.tingkat).filter(Boolean))].map(String).sort();
    return { rows, tingkatList };
  });
