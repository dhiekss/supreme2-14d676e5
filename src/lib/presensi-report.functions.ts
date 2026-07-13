import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// PostgREST caps a single response (~1000 rows). Page through until we get everything.
const PAGE = 1000;
async function fetchAllPaged<T = any>(builder: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // safety cap ~500k rows
  for (let i = 0; i < 500; i++) {
    const { data, error } = await builder(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function fetchDetailsByRecordIds(supabase: any, recIds: string[]): Promise<any[]> {
  if (!recIds.length) return [];
  const out: any[] = [];
  // chunk IN() to avoid URL length issues and page each chunk
  const CHUNK = 200;
  for (let i = 0; i < recIds.length; i += CHUNK) {
    const slice = recIds.slice(i, i + CHUNK);
    const rows = await fetchAllPaged((from, to) =>
      supabase
        .from("attendance_details")
        .select("attendance_record_id, student_id, status")
        .in("attendance_record_id", slice)
        .range(from, to),
    );
    out.push(...rows);
  }
  return out;
}


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

    const [rombelAll, guruRes, studentsAll] = await Promise.all([
      fetchAllPaged((f, t) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").range(f, t)),
      supabase.from("guru").select("*", { count: "exact", head: true }),
      fetchAllPaged((f, t) => supabase.from("students").select("id, nis, name, rombel_id").range(f, t)),
    ]);
    const allRombel = rombelAll;
    const rombel = data.konsentrasi && data.konsentrasi !== "__all"
      ? allRombel.filter((r: any) => r.konsentrasi_keahlian === data.konsentrasi)
      : allRombel;
    const rombelIds = new Set(rombel.map((r: any) => r.id));
    const rombelById = new Map(allRombel.map((r: any) => [r.id, r]));
    const students = studentsAll.filter((s: any) => s.rombel_id && rombelIds.has(s.rombel_id));
    const studentById = new Map(students.map((s: any) => [s.id, s]));

    const records = await fetchAllPaged((from, to) =>
      supabase
        .from("attendance_records")
        .select("id, date, rombel_id")
        .gte("date", data.from)
        .lte("date", data.to)
        .range(from, to),
    );
    const recs = (records ?? []).filter((r: any) => r.rombel_id && rombelIds.has(r.rombel_id));
    const recIds = recs.map((r: any) => r.id);
    const recById = new Map(recs.map((r: any) => [r.id, r]));

    const dets = await fetchDetailsByRecordIds(supabase, recIds);


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
    const [allRombel, allStudents, records] = await Promise.all([
      fetchAllPaged((f, t) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").range(f, t)),
      fetchAllPaged((f, t) => supabase.from("students").select("id, rombel_id").range(f, t)),
      fetchAllPaged((f, t) => supabase.from("attendance_records").select("rombel_id").eq("date", data.date).range(f, t)),
    ]);
    const filtered = data.tingkat && data.tingkat !== "__all"
      ? allRombel.filter((r: any) => String(r.tingkat) === String(data.tingkat))
      : allRombel;
    const hasRec = new Set(records.map((r: any) => r.rombel_id));
    const countByRombel = new Map<string, number>();
    for (const s of allStudents) {
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

export const attendanceDetailList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      date: z.string().optional().nullable(),
      rombelId: z.string().uuid().optional().nullable(),
      officer: z.string().optional().nullable(),
      from: z.string().optional().nullable(),
      to: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    let q = supabase
      .from("attendance_records")
      .select("id, date, rombel_id, officer_name")
      .order("date", { ascending: false })
      .range(0, 9999);
    if (data.date) q = q.eq("date", data.date);
    if (data.rombelId) q = q.eq("rombel_id", data.rombelId);
    if (data.officer) q = q.eq("officer_name", data.officer);
    if (data.from) q = q.gte("date", data.from);
    if (data.to) q = q.lte("date", data.to);
    const { data: recs, error } = await q;
    if (error) throw new Error(error.message);

    const rombelIds = [...new Set((recs ?? []).map((r) => r.rombel_id).filter(Boolean) as string[])];
    const recIds = (recs ?? []).map((r) => r.id);
    const [rombelRes, studentsRes, detailsRes] = await Promise.all([
      rombelIds.length
        ? supabase.from("rombel").select("id, name, wali_kelas_name").in("id", rombelIds)
        : Promise.resolve({ data: [] as any[] }),
      rombelIds.length
        ? supabase.from("students").select("id, rombel_id").in("rombel_id", rombelIds).range(0, 99999)
        : Promise.resolve({ data: [] as any[] }),
      recIds.length
        ? supabase.from("attendance_details").select("attendance_record_id, status").in("attendance_record_id", recIds).range(0, 999999)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const rMap = new Map((rombelRes.data ?? []).map((r: any) => [r.id, r]));
    const countByRombel = new Map<string, number>();
    for (const s of studentsRes.data ?? []) {
      if (!s.rombel_id) continue;
      countByRombel.set(s.rombel_id, (countByRombel.get(s.rombel_id) ?? 0) + 1);
    }
    const perRec = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    for (const d of detailsRes.data ?? []) {
      const key = d.attendance_record_id as string;
      if (!perRec.has(key)) perRec.set(key, { H: 0, S: 0, I: 0, A: 0, P: 0 });
      const r = perRec.get(key)!;
      const st = d.status as keyof typeof r;
      if (st in r) r[st]++;
    }
    return (recs ?? []).map((r) => {
      const rb: any = r.rombel_id ? rMap.get(r.rombel_id) : null;
      const c = perRec.get(r.id) ?? { H: 0, S: 0, I: 0, A: 0, P: 0 };
      return {
        id: r.id,
        date: r.date,
        rombel_id: r.rombel_id,
        rombel: rb?.name ?? "-",
        walikelas: rb?.wali_kelas_name ?? "-",
        officer_name: r.officer_name ?? "-",
        jumlahMurid: r.rombel_id ? countByRombel.get(r.rombel_id) ?? 0 : 0,
        ...c,
      };
    });
  });

export const attendanceDetailView = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ recordId: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rec, error } = await supabase
      .from("attendance_records")
      .select("id, date, rombel_id, officer_name")
      .eq("id", data.recordId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rec) throw new Error("Record tidak ditemukan");
    const [rombelRes, studentsRes, detailsRes] = await Promise.all([
      rec.rombel_id
        ? supabase.from("rombel").select("id, name, wali_kelas_name").eq("id", rec.rombel_id).maybeSingle()
        : Promise.resolve({ data: null as any }),
      rec.rombel_id
        ? supabase.from("students").select("id, nis, name").eq("rombel_id", rec.rombel_id).order("name")
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("attendance_details").select("student_id, status").eq("attendance_record_id", rec.id),
    ]);
    const statusMap = new Map((detailsRes.data ?? []).map((d: any) => [d.student_id, d.status]));
    const students = (studentsRes.data ?? []).map((s: any) => ({
      id: s.id,
      nis: s.nis,
      name: s.name,
      status: (statusMap.get(s.id) as string) ?? "H",
    }));
    return {
      record: {
        id: rec.id,
        date: rec.date,
        rombel_id: rec.rombel_id,
        rombel_name: (rombelRes as any).data?.name ?? "-",
        wali_kelas: (rombelRes as any).data?.wali_kelas_name ?? "-",
        officer_name: rec.officer_name ?? "-",
      },
      students,
    };
  });

export const deleteAttendanceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ recordId: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    await supabase.from("attendance_details").delete().eq("attendance_record_id", data.recordId);
    const { error } = await supabase.from("attendance_records").delete().eq("id", data.recordId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listOfficers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("attendance_records")
      .select("officer_name")
      .not("officer_name", "is", null)
      .range(0, 9999);
    const set = new Set<string>();
    for (const r of data ?? []) {
      const n = String(r.officer_name ?? "").trim();
      if (n) set.add(n);
    }
    return [...set].sort();
  });

