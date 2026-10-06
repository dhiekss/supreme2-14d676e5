import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAllowedRombelIds } from "@/lib/rombel-access";
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
    const allowed = await getAllowedRombelIds(supabase, context.userId);
    if (allowed !== null && !allowed.includes(data.rombelId)) {
      throw new Error("Forbidden: Anda tidak memiliki akses ke rombel ini");
    }


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
    const allowed = await getAllowedRombelIds(supabase, context.userId);
    if (allowed !== null && allowed.length === 0) {
      return {
        filter: { from: data.from, to: data.to, konsentrasi: data.konsentrasi ?? "__all" },
        stats: { totalKelas: 0, totalPengajar: 0, totalMurid: 0 },
        totals: { sesi: 0, H: 0, S: 0, I: 0, A: 0, P: 0, kehadiran: 0 },
        trend: [] as { date: string; H: number; S: number; I: number; A: number; P: number }[],
        rombelBelum: [] as { id: string; name: string; walikelas: string | null; tingkat: string | null }[],
        alfaTop: [] as { id: string; name: string; nis: string | null; rombel: string; count: number }[],
        detailRows: [] as { date: string; rombel: string; walikelas: string | null; H: number; S: number; I: number; A: number; P: number; total: number }[],
        konsentrasiList: [] as string[],
      };
    }


    const [rombelAll, guruRes, studentsAll] = await Promise.all([
      fetchAllPaged((f, t) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").range(f, t)),
      supabase.from("guru").select("*", { count: "exact", head: true }),
      fetchAllPaged((f, t) => supabase.from("students").select("id, nis, name, rombel_id").range(f, t)),
    ]);
    const filteredAll = allowed === null ? rombelAll : rombelAll.filter((r: any) => allowed.includes(r.id));
    const rombel = data.konsentrasi && data.konsentrasi !== "__all"
      ? filteredAll.filter((r: any) => r.konsentrasi_keahlian === data.konsentrasi)
      : filteredAll;
    const rombelIds = new Set(rombel.map((r: any) => r.id));
    const rombelById = new Map(filteredAll.map((r: any) => [r.id, r]));
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
    const alfaTopBase = [...alfaByStudent.entries()]
      .map(([sid, count]) => {
        const s: any = studentById.get(sid);
        if (!s) return null;
        const r: any = rombelById.get(s.rombel_id);
        return { id: sid, nis: s.nis, name: s.name, rombel: r?.name ?? "-", tingkat: r?.tingkat ?? "-", count };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.count - a.count) as any[];

    // SP status + tindakan wali kelas (Manajemen BP/BK) — chunked to avoid IN-limit
    const topIds = alfaTopBase.map((s: any) => s.id);
    let spRows: any[] = [];
    let waliRows: any[] = [];
    for (let i = 0; i < topIds.length; i += 200) {
      const chunk = topIds.slice(i, i + 200);
      const [spRes, waliRes] = await Promise.all([
        supabase.from("sp_records").select("student_id, sp_level, tanggal_rekaman").in("student_id", chunk),
        supabase.from("wali_tindakan").select("student_id, tanggal").in("student_id", chunk),
      ]);
      spRows = spRows.concat((spRes as any).data ?? []);
      waliRows = waliRows.concat((waliRes as any).data ?? []);
    }
    const spByStudent = new Map<string, { level: number; date: string | null }>();
    for (const r of spRows) {
      const lvl = Number(r.sp_level ?? 0);
      const prev = spByStudent.get(r.student_id);
      if (!prev || lvl > prev.level) spByStudent.set(r.student_id, { level: lvl, date: r.tanggal_rekaman ?? null });
    }
    const waliByStudent = new Map<string, string | null>();
    for (const r of waliRows) {
      const prev = waliByStudent.get(r.student_id);
      if (!prev || String(r.tanggal) > String(prev)) waliByStudent.set(r.student_id, r.tanggal ?? null);
    }
    const alfaTop = alfaTopBase.map((s: any) => {
      const sp = spByStudent.get(s.id);
      const wali = waliByStudent.get(s.id);
      return {
        ...s,
        spLevel: sp?.level ?? null,
        spStatus: sp ? `SP ${sp.level}` : wali ? "Tindakan Wali Kelas" : "Perlu Tindakan Wali Kelas",
        spDate: sp?.date ?? wali ?? null,
      };
    });


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

    const konsentrasiList = [...new Set(filteredAll.map((r: any) => r.konsentrasi_keahlian).filter(Boolean))] as string[];

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
    const allowed = await getAllowedRombelIds(supabase, context.userId);
    if (allowed !== null && allowed.length === 0) return { rows: [], tingkatList: [] as string[], konsentrasiList: [] as string[] };
    const [allRombel, allStudents, records] = await Promise.all([
      fetchAllPaged((f, t) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").range(f, t)),
      fetchAllPaged((f, t) => supabase.from("students").select("id, rombel_id").range(f, t)),
      fetchAllPaged((f, t) => supabase.from("attendance_records").select("rombel_id").eq("date", data.date).range(f, t)),
    ]);
    const scoped = allowed === null ? allRombel : allRombel.filter((r: any) => allowed.includes(r.id));
    const filtered = data.tingkat && data.tingkat !== "__all"
      ? scoped.filter((r: any) => String(r.tingkat) === String(data.tingkat))
      : scoped;
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
    const tingkatList = [...new Set(scoped.map((r: any) => r.tingkat).filter(Boolean))].map(String).sort();
    const konsentrasiList = [...new Set(scoped.map((r: any) => r.konsentrasi_keahlian).filter(Boolean))].map(String).sort();
    return { rows, tingkatList, konsentrasiList };

  });

export const rombelBelumInputRange = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      from: z.string(),
      to: z.string(),
      tingkat: z.array(z.string()).optional().nullable(),
      konsentrasi: z.array(z.string()).optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const allowed = await getAllowedRombelIds(supabase, context.userId);
    if (allowed !== null && allowed.length === 0) return { rows: [] as any[] };
    const [allRombel, allStudents, records] = await Promise.all([
      fetchAllPaged((f, t) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").range(f, t)),
      fetchAllPaged((f, t) => supabase.from("students").select("id, rombel_id").range(f, t)),
      fetchAllPaged((f, t) =>
        supabase.from("attendance_records").select("rombel_id, date").gte("date", data.from).lte("date", data.to).range(f, t),
      ),
    ]);
    const scoped = allowed === null ? allRombel : allRombel.filter((r: any) => allowed.includes(r.id));
    const tSet = new Set((data.tingkat ?? []).map(String));
    const kSet = new Set((data.konsentrasi ?? []).map(String));
    const filtered = scoped.filter((r: any) =>
      (tSet.size === 0 || tSet.has(String(r.tingkat))) &&
      (kSet.size === 0 || kSet.has(String(r.konsentrasi_keahlian))),
    );
    const countByRombel = new Map<string, number>();
    for (const s of allStudents) {
      if (!s.rombel_id) continue;
      countByRombel.set(s.rombel_id, (countByRombel.get(s.rombel_id) ?? 0) + 1);
    }
    const hasRec = new Set(records.map((r: any) => `${r.date}|${r.rombel_id}`));
    // build date list
    const dates: string[] = [];
    const start = new Date(`${data.from}T00:00:00Z`);
    const end = new Date(`${data.to}T00:00:00Z`);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue; // Lewati Minggu & Sabtu
      dates.push(d.toISOString().slice(0, 10));
    }
    const rows: {
      tanggal: string; hari: string; name: string; tingkat: string | null;
      konsentrasi: string | null; walikelas: string; jumlahMurid: number;
    }[] = [];
    const hariNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    for (const tgl of dates) {
      const dow = new Date(`${tgl}T00:00:00Z`).getUTCDay();
      for (const r of filtered) {
        if (hasRec.has(`${tgl}|${r.id}`)) continue;
        rows.push({
          tanggal: tgl,
          hari: hariNames[dow]!,
          name: r.name,
          tingkat: r.tingkat,
          konsentrasi: r.konsentrasi_keahlian,
          walikelas: r.wali_kelas_name ?? "-",
          jumlahMurid: countByRombel.get(r.id) ?? 0,
        });
      }
    }
    rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || String(a.name).localeCompare(String(b.name)));
    return { rows };
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
    const allowed = await getAllowedRombelIds(supabase, context.userId);
    if (allowed !== null && allowed.length === 0) return [] as any[];
    if (data.rombelId && allowed !== null && !allowed.includes(data.rombelId)) return [] as any[];
    const recs = await fetchAllPaged<any>((f, t) => {
      let q = supabase
        .from("attendance_records")
        .select("id, date, rombel_id, officer_name")
        .order("date", { ascending: false })
        .range(f, t);
      if (data.date) q = q.eq("date", data.date);
      if (data.rombelId) q = q.eq("rombel_id", data.rombelId);
      if (allowed !== null) q = q.in("rombel_id", allowed);
      if (data.officer) q = q.eq("officer_name", data.officer);
      if (data.from) q = q.gte("date", data.from);
      if (data.to) q = q.lte("date", data.to);
      return q;
    });


    const rombelIds = [...new Set(recs.map((r: any) => r.rombel_id).filter(Boolean) as string[])];
    const recIds = recs.map((r: any) => r.id);
    const [rombelRes, students, details] = await Promise.all([
      rombelIds.length
        ? supabase.from("rombel").select("id, name, wali_kelas_name, tingkat, konsentrasi_keahlian").in("id", rombelIds)
        : Promise.resolve({ data: [] as any[] }),
      rombelIds.length
        ? fetchAllPaged((f, t) => supabase.from("students").select("id, rombel_id").in("rombel_id", rombelIds).range(f, t))
        : Promise.resolve([] as any[]),
      fetchDetailsByRecordIds(supabase, recIds),
    ]);
    const rMap = new Map((rombelRes.data ?? []).map((r: any) => [r.id, r]));
    const countByRombel = new Map<string, number>();
    for (const s of students as any[]) {
      if (!s.rombel_id) continue;
      countByRombel.set(s.rombel_id, (countByRombel.get(s.rombel_id) ?? 0) + 1);
    }
    const perRec = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    for (const d of details as any[]) {
      const key = d.attendance_record_id as string;
      if (!perRec.has(key)) perRec.set(key, { H: 0, S: 0, I: 0, A: 0, P: 0 });
      const r = perRec.get(key)!;
      const st = d.status as keyof typeof r;
      if (st in r) r[st]++;
    }
    return recs.map((r: any) => {
      const rb: any = r.rombel_id ? rMap.get(r.rombel_id) : null;
      const c = perRec.get(r.id) ?? { H: 0, S: 0, I: 0, A: 0, P: 0 };
      return {
        id: r.id,
        date: r.date,
        rombel_id: r.rombel_id,
        rombel: rb?.name ?? "-",
        walikelas: rb?.wali_kelas_name ?? "-",
        tingkat: rb?.tingkat ?? null,
        konsentrasi: rb?.konsentrasi_keahlian ?? null,
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
    const allowed = await getAllowedRombelIds(supabase, context.userId);
    if (allowed !== null && (!rec.rombel_id || !allowed.includes(rec.rombel_id))) {
      throw new Error("Forbidden: Anda tidak memiliki akses ke rombel ini");
    }
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
    const rows = await fetchAllPaged<any>((f, t) =>
      context.supabase
        .from("attendance_records")
        .select("officer_name")
        .not("officer_name", "is", null)
        .range(f, t),
    );
    const set = new Set<string>();
    for (const r of rows) {
      const n = String(r.officer_name ?? "").trim();
      if (n) set.add(n);
    }
    return [...set].sort();
  });


export const presensiPerMurid = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ from: z.string(), to: z.string() }).parse)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const allowed = await getAllowedRombelIds(supabase, context.userId);
    if (allowed !== null && allowed.length === 0) return { rows: [] as any[] };
    const [rombelAll, studentsAll, records] = await Promise.all([
      fetchAllPaged((f, t) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian").range(f, t)),
      fetchAllPaged((f, t) => supabase.from("students").select("id, nis, name, rombel_id").range(f, t)),
      fetchAllPaged((f, t) =>
        supabase.from("attendance_records").select("id, rombel_id").gte("date", data.from).lte("date", data.to).range(f, t),
      ),
    ]);
    const rombel = allowed === null ? rombelAll : rombelAll.filter((r: any) => allowed.includes(r.id));
    const rombelById = new Map(rombel.map((r: any) => [r.id, r]));
    const students = studentsAll.filter((s: any) => s.rombel_id && rombelById.has(s.rombel_id));
    const recIds = records.filter((r: any) => r.rombel_id && rombelById.has(r.rombel_id)).map((r: any) => r.id);
    const dets = await fetchDetailsByRecordIds(supabase, recIds);
    const counts = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    for (const d of dets) {
      let c = counts.get(d.student_id);
      if (!c) { c = { H: 0, S: 0, I: 0, A: 0, P: 0 }; counts.set(d.student_id, c); }
      const st = d.status as keyof typeof c;
      if (st in c) c[st]++;
    }
    const rows = students.map((s: any) => {
      const r: any = rombelById.get(s.rombel_id);
      const c = counts.get(s.id) ?? { H: 0, S: 0, I: 0, A: 0, P: 0 };
      return {
        id: s.id, nis: s.nis ?? "", name: s.name,
        rombel_id: s.rombel_id, rombel: r?.name ?? "-",
        tingkat: r?.tingkat != null ? String(r.tingkat) : "-",
        konsentrasi: r?.konsentrasi_keahlian ?? "-",
        ...c,
      };
    }).sort((a: any, b: any) => a.rombel.localeCompare(b.rombel) || String(a.name).localeCompare(String(b.name)));
    return { rows };
  });
