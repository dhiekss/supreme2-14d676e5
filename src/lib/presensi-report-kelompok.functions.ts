import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PAGE = 1000;
async function fetchAllPaged<T = any>(builder: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
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
  const CHUNK = 200;
  for (let i = 0; i < recIds.length; i += CHUNK) {
    const slice = recIds.slice(i, i + CHUNK);
    const rows = await fetchAllPaged((from, to) =>
      supabase.from("attendance_details")
        .select("attendance_record_id, student_id, status")
        .in("attendance_record_id", slice)
        .range(from, to),
    );
    out.push(...rows);
  }
  return out;
}

async function loadKelompokBundle(supabase: any) {
  const [kb, angg, pemb, guru, tendik, students, rombel] = await Promise.all([
    fetchAllPaged((f, t) => supabase.from("kelompok_belajar").select("id, nama").order("nama").range(f, t)),
    fetchAllPaged((f, t) => supabase.from("kelompok_belajar_anggota").select("kelompok_id, student_id").range(f, t)),
    fetchAllPaged((f, t) => supabase.from("kelompok_belajar_pembimbing").select("kelompok_id, pembimbing_type, pembimbing_id").range(f, t)),
    fetchAllPaged((f, t) => supabase.from("guru").select("id, nama, nip").range(f, t)),
    fetchAllPaged((f, t) => supabase.from("tendik").select("id, nama, nip").range(f, t)),
    fetchAllPaged((f, t) => supabase.from("students").select("id, nis, name, rombel_id").range(f, t)),
    fetchAllPaged((f, t) => supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian").range(f, t)),
  ]);
  const guruMap = new Map(guru.map((g: any) => [g.id, g]));
  const tendikMap = new Map(tendik.map((t: any) => [t.id, t]));
  const studentById = new Map(students.map((s: any) => [s.id, s]));
  const rombelById = new Map(rombel.map((r: any) => [r.id, r]));
  const membersByKelompok = new Map<string, string[]>();
  for (const a of angg as any[]) {
    const arr = membersByKelompok.get(a.kelompok_id) ?? [];
    arr.push(a.student_id);
    membersByKelompok.set(a.kelompok_id, arr);
  }
  const pembByKelompok = new Map<string, { nama: string; type: string }[]>();
  for (const p of pemb as any[]) {
    const src: any = p.pembimbing_type === "guru" ? guruMap.get(p.pembimbing_id) : tendikMap.get(p.pembimbing_id);
    const arr = pembByKelompok.get(p.kelompok_id) ?? [];
    arr.push({ nama: src?.nama ?? "-", type: p.pembimbing_type });
    pembByKelompok.set(p.kelompok_id, arr);
  }
  const kelompokList = (kb as any[]).map((k) => {
    const members = membersByKelompok.get(k.id) ?? [];
    const tSet = new Set<string>();
    const kSet = new Set<string>();
    for (const sid of members) {
      const s: any = studentById.get(sid);
      const r: any = s?.rombel_id ? rombelById.get(s.rombel_id) : null;
      if (r?.tingkat) tSet.add(String(r.tingkat));
      if (r?.konsentrasi_keahlian) kSet.add(String(r.konsentrasi_keahlian));
    }
    return {
      id: k.id as string,
      nama: k.nama as string,
      members,
      pembimbings: pembByKelompok.get(k.id) ?? [],
      tingkatList: [...tSet].sort(),
      konsentrasiKeahlianList: [...kSet].sort(),
    };
  });
  return { kelompokList, studentById, rombelById };
}


export const presensiDashboardKelompok = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      from: z.string(),
      to: z.string(),
      kelompokId: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const bundle = await loadKelompokBundle(supabase);
    const scope = data.kelompokId && data.kelompokId !== "__all"
      ? bundle.kelompokList.filter((k) => k.id === data.kelompokId)
      : bundle.kelompokList;

    // Fetch all attendance records in range once
    const records = await fetchAllPaged<any>((f, t) =>
      supabase.from("attendance_records")
        .select("id, date, rombel_id")
        .gte("date", data.from).lte("date", data.to).range(f, t),
    );
    const recById = new Map(records.map((r: any) => [r.id, r]));
    const details = await fetchDetailsByRecordIds(supabase, records.map((r: any) => r.id));

    // Index: date -> student_id -> status
    const detailByDateStudent = new Map<string, Map<string, string>>();
    for (const d of details) {
      const rec: any = recById.get(d.attendance_record_id);
      if (!rec) continue;
      const dt = String(rec.date);
      let m = detailByDateStudent.get(dt);
      if (!m) { m = new Map(); detailByDateStudent.set(dt, m); }
      m.set(d.student_id, d.status);
    }
    const dates = [...detailByDateStudent.keys()].sort();

    // Aggregate per kelompok
    const totals = { H: 0, S: 0, I: 0, A: 0, P: 0 };
    const dateAgg = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    const perGroupDate = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    const alfaByStudent = new Map<string, number>();
    const kelompokWithSession = new Set<string>();
    let sesiCount = 0;

    for (const k of scope) {
      const memberSet = new Set(k.members);
      for (const dt of dates) {
        const m = detailByDateStudent.get(dt)!;
        let has = false;
        const counts = { H: 0, S: 0, I: 0, A: 0, P: 0 };
        for (const sid of memberSet) {
          const st = m.get(sid);
          if (!st) continue;
          has = true;
          if ((st as any) in counts) {
            counts[st as keyof typeof counts]++;
            totals[st as keyof typeof totals]++;
            const da = dateAgg.get(dt) ?? { H: 0, S: 0, I: 0, A: 0, P: 0 };
            (da as any)[st]++;
            dateAgg.set(dt, da);
            if (st === "A") alfaByStudent.set(sid, (alfaByStudent.get(sid) ?? 0) + 1);
          }
        }
        if (has) {
          sesiCount++;
          kelompokWithSession.add(k.id);
          perGroupDate.set(`${k.id}|${dt}`, counts);
        }
      }
    }

    const totalKehadiran = totals.H + totals.S + totals.I + totals.A + totals.P;
    const trend = [...dateAgg.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));

    // Kelompok belum input in the entire range
    const kelompokBelum = scope
      .filter((k) => !kelompokWithSession.has(k.id))
      .map((k) => ({
        id: k.id,
        name: k.nama,
        walikelas: k.pembimbings.map((p) => p.nama).join(", ") || "-",
        tingkat: null as string | null,
      }));

    const alfaTop = [...alfaByStudent.entries()]
      .map(([sid, count]) => {
        const s: any = bundle.studentById.get(sid);
        if (!s) return null;
        const r: any = s.rombel_id ? bundle.rombelById.get(s.rombel_id) : null;
        return { id: sid, nis: s.nis, name: s.name, rombel: r?.name ?? "-", tingkat: "-", count };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 15);

    // Detail rows: per (kelompok, date)
    const detailRows: any[] = [];
    for (const [key, c] of perGroupDate.entries()) {
      const [kid, dt] = key.split("|");
      const k = scope.find((x) => x.id === kid)!;
      const total = c.H + c.S + c.I + c.A + c.P;
      detailRows.push({
        id: key,
        kelompokId: kid,
        date: dt,
        rombel: k.nama,
        walikelas: k.pembimbings.map((p) => p.nama).join(", ") || "-",
        ...c,
        total,
      });
    }
    detailRows.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    // Unique members across scope (for stats.totalMurid)
    const uniqMembers = new Set<string>();
    const uniqPemb = new Set<string>();
    for (const k of scope) {
      for (const m of k.members) uniqMembers.add(m);
      for (const p of k.pembimbings) uniqPemb.add(`${p.type}:${p.nama}`);
    }

    return {
      filter: { from: data.from, to: data.to, konsentrasi: data.kelompokId ?? "__all" },
      stats: {
        totalKelas: scope.length,
        totalPengajar: uniqPemb.size,
        totalMurid: uniqMembers.size,
      },
      totals: {
        sesi: sesiCount,
        H: totals.H, S: totals.S, I: totals.I, A: totals.A, P: totals.P,
        kehadiran: totalKehadiran,
      },
      trend,
      rombelBelum: kelompokBelum,
      alfaTop,
      detailRows: detailRows.slice(0, 200),
      konsentrasiList: bundle.kelompokList.map((k) => ({ id: k.id, nama: k.nama })),
    };
  });

export const kelompokBelumInputByDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ date: z.string() }).parse)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const bundle = await loadKelompokBundle(supabase);
    const records = await fetchAllPaged<any>((f, t) =>
      supabase.from("attendance_records").select("id, rombel_id").eq("date", data.date).range(f, t),
    );
    const details = await fetchDetailsByRecordIds(supabase, records.map((r: any) => r.id));
    const studentsWithAttendance = new Set<string>();
    for (const d of details) studentsWithAttendance.add(d.student_id);
    const rows = bundle.kelompokList
      .filter((k) => !k.members.some((sid) => studentsWithAttendance.has(sid)))
      .map((k) => ({
        id: k.id,
        name: k.nama,
        tingkat: null,
        walikelas: k.pembimbings.map((p) => p.nama).join(", ") || "-",
        jumlahMurid: k.members.length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { rows, tingkatList: [] as string[] };
  });

export const attendanceDetailListKelompok = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      date: z.string().optional().nullable(),
      kelompokId: z.string().optional().nullable(),
      from: z.string().optional().nullable(),
      to: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const bundle = await loadKelompokBundle(supabase);
    const scope = data.kelompokId && data.kelompokId !== "__all"
      ? bundle.kelompokList.filter((k) => k.id === data.kelompokId)
      : bundle.kelompokList;

    let q = supabase.from("attendance_records").select("id, date, rombel_id, officer_name");
    if (data.date) q = q.eq("date", data.date);
    if (data.from) q = q.gte("date", data.from);
    if (data.to) q = q.lte("date", data.to);
    const records = await fetchAllPaged<any>((f, t) => q.range(f, t));
    const recById = new Map(records.map((r: any) => [r.id, r]));
    const details = await fetchDetailsByRecordIds(supabase, records.map((r: any) => r.id));

    const detailByDateStudent = new Map<string, Map<string, string>>();
    const officersByDate = new Map<string, Set<string>>();
    for (const d of details) {
      const rec: any = recById.get(d.attendance_record_id);
      if (!rec) continue;
      const dt = String(rec.date);
      let m = detailByDateStudent.get(dt);
      if (!m) { m = new Map(); detailByDateStudent.set(dt, m); }
      m.set(d.student_id, d.status);
      if (rec.officer_name) {
        let s = officersByDate.get(dt);
        if (!s) { s = new Set(); officersByDate.set(dt, s); }
        s.add(rec.officer_name);
      }
    }

    const out: any[] = [];
    for (const k of scope) {
      const memberSet = new Set(k.members);
      for (const [dt, m] of detailByDateStudent.entries()) {
        const c = { H: 0, S: 0, I: 0, A: 0, P: 0 };
        let has = false;
        for (const sid of memberSet) {
          const st = m.get(sid);
          if (!st) continue;
          has = true;
          if ((st as any) in c) c[st as keyof typeof c]++;
        }
        if (!has) continue;
        out.push({
          id: `${k.id}|${dt}`,
          kelompokId: k.id,
          date: dt,
          rombel_id: null,
          rombel: k.nama,
          walikelas: k.pembimbings.map((p) => p.nama).join(", ") || "-",
          officer_name: [...(officersByDate.get(dt) ?? [])].join(", ") || "-",
          jumlahMurid: k.members.length,
          ...c,
        });
      }
    }
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  });

export const attendanceDetailViewKelompok = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ kelompokId: z.string().uuid(), date: z.string() }).parse)
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const bundle = await loadKelompokBundle(supabase);
    const k = bundle.kelompokList.find((x) => x.id === data.kelompokId);
    if (!k) throw new Error("Kelompok tidak ditemukan");
    const records = await fetchAllPaged<any>((f, t) =>
      supabase.from("attendance_records").select("id, date, rombel_id, officer_name").eq("date", data.date).range(f, t),
    );
    const details = await fetchDetailsByRecordIds(supabase, records.map((r: any) => r.id));
    const statusByStudent = new Map<string, string>();
    for (const d of details) statusByStudent.set(d.student_id, d.status);
    const memberList = k.members
      .map((sid) => bundle.studentById.get(sid))
      .filter(Boolean)
      .map((s: any) => ({
        id: s.id,
        nis: s.nis,
        name: s.name,
        status: statusByStudent.get(s.id) ?? "-",
      }))
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    const officers = [...new Set(records.map((r: any) => r.officer_name).filter(Boolean))].join(", ") || "-";
    return {
      record: {
        id: `${k.id}|${data.date}`,
        date: data.date,
        rombel_id: null,
        rombel_name: k.nama,
        wali_kelas: k.pembimbings.map((p) => p.nama).join(", ") || "-",
        officer_name: officers,
      },
      students: memberList,
    };
  });

export const listOfficersKelompok = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await fetchAllPaged<any>((f, t) =>
      context.supabase.from("attendance_records").select("officer_name").not("officer_name", "is", null).range(f, t),
    );
    const set = new Set<string>();
    for (const r of rows) {
      const n = String(r.officer_name ?? "").trim();
      if (n) set.add(n);
    }
    return [...set].sort();
  });
