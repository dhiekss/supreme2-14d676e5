import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAllowedRombelIds } from "./rombel-access";
import { z } from "zod";

const HARI = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];

function normalizeStatus(s: string | null | undefined) {
  const v = String(s ?? "").toLowerCase();
  if (v === "h" || v === "hadir") return "H";
  if (v === "s" || v === "sakit") return "S";
  if (v === "i" || v === "izin") return "I";
  if (v === "a" || v === "alfa") return "A";
  if (v === "p" || v === "pkl") return "P";
  return v.toUpperCase();
}

export const listKonsentrasiForKakonli = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const allowed = await getAllowedRombelIds(supabase, userId);
    let q = supabase.from("rombel").select("id, name, konsentrasi_keahlian");
    if (allowed !== null) {
      if (allowed.length === 0) return [] as string[];
      q = q.in("id", allowed);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of data ?? []) {
      if (r.konsentrasi_keahlian) set.add(r.konsentrasi_keahlian);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  });

export const getKakonliDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      konsentrasi: z.string().min(1),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const allowed = await getAllowedRombelIds(supabase, userId);

    // Active semester
    const { data: activeSem } = await supabase
      .from("semester")
      .select("id, nama, tanggal_mulai, tanggal_selesai, tahun_ajaran_id")
      .eq("is_active", true)
      .maybeSingle();
    const { data: activeTA } = activeSem?.tahun_ajaran_id
      ? await supabase.from("tahun_ajaran").select("id, nama").eq("id", activeSem.tahun_ajaran_id).maybeSingle()
      : { data: null as any };

    const semStart = (activeSem?.tanggal_mulai ?? null) as string | null;
    const semEnd = (activeSem?.tanggal_selesai ?? null) as string | null;

    // Range determination
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const clamp = (d: string) => {
      if (semStart && d < semStart) return semStart;
      if (semEnd && d > semEnd) return semEnd;
      return d;
    };
    let startDate = data.startDate;
    let endDate = data.endDate;
    if (!startDate || !endDate) {
      // default: current month clamped to semester
      const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const mEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
      startDate = clamp(mStart);
      endDate = clamp(mEnd);
      // if today's month outside semester, fallback to semester bounds
      if (semStart && semEnd && (today < semStart || today > semEnd)) {
        startDate = semStart;
        endDate = semEnd;
      }
    } else {
      startDate = clamp(startDate);
      endDate = clamp(endDate);
    }

    const emptySemMeta = {
      semester: activeSem
        ? { id: activeSem.id, nama: activeSem.nama, tanggal_mulai: semStart, tanggal_selesai: semEnd }
        : null,
      tahunAjaran: activeTA ? { id: activeTA.id, nama: activeTA.nama } : null,
      range: { startDate, endDate },
    };

    // Rombel dalam konsentrasi (respecting akses)
    let rq = supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian")
      .eq("konsentrasi_keahlian", data.konsentrasi)
      .order("name");
    if (allowed !== null) {
      if (allowed.length === 0) return emptyResult(data.konsentrasi, emptySemMeta);
      rq = rq.in("id", allowed);
    }
    const { data: rombelRows, error: rerr } = await rq;
    if (rerr) throw new Error(rerr.message);
    const rombels = (rombelRows ?? []) as any[];
    if (rombels.length === 0) return emptyResult(data.konsentrasi, emptySemMeta);
    const rombelIds = rombels.map((r) => r.id);
    const rombelNameById = new Map(rombels.map((r) => [r.id, r.name]));

    // Students
    const { data: studentsRaw } = await supabase
      .from("students")
      .select("id, name, nis, rombel_id")
      .in("rombel_id", rombelIds);
    const students = (studentsRaw ?? []) as any[];
    const studentIds = students.map((s) => s.id);
    const studentById = new Map(students.map((s) => [s.id, s]));

    // Attendance range
    const { data: monthRecs } = await supabase
      .from("attendance_records")
      .select("id, date, rombel_id")
      .in("rombel_id", rombelIds)
      .gte("date", startDate)
      .lte("date", endDate);
    const recById = new Map((monthRecs ?? []).map((r: any) => [r.id, r]));
    const recIds = (monthRecs ?? []).map((r: any) => r.id);
    const { data: dets } = recIds.length
      ? await supabase
          .from("attendance_details")
          .select("student_id, status, attendance_record_id")
          .in("attendance_record_id", recIds)
      : { data: [] as any[] };
    let H = 0, S = 0, I = 0, A = 0, P = 0;
    // per-student aggregates
    type PerStud = { H: number; S: number; I: number; A: number; P: number; dates: string[] };
    const perStud = new Map<string, PerStud>();
    const ensure = (sid: string) => {
      let x = perStud.get(sid);
      if (!x) { x = { H: 0, S: 0, I: 0, A: 0, P: 0, dates: [] }; perStud.set(sid, x); }
      return x;
    };
    (dets ?? []).forEach((d: any) => {
      const st = normalizeStatus(d.status);
      const rec = recById.get(d.attendance_record_id);
      const dateStr = rec?.date ?? "";
      const x = ensure(d.student_id);
      if (st === "H") { H++; x.H++; }
      else if (st === "S") { S++; x.S++; }
      else if (st === "I") { I++; x.I++; }
      else if (st === "A") { A++; x.A++; if (dateStr) x.dates.push(dateStr); }
      else if (st === "P") { P++; x.P++; }
    });
    const totalPresensi = H + S + I + A + P;
    const kehadiranPct = totalPresensi > 0 ? Math.round((H / totalPresensi) * 100) : 0;

    // Detail lists
    const kehadiranList = students
      .map((s) => {
        const x = perStud.get(s.id);
        const tot = x ? x.H + x.S + x.I + x.A + x.P : 0;
        const pct = tot > 0 ? Math.round(((x?.H ?? 0) / tot) * 100) : 0;
        return {
          student_id: s.id, name: s.name, nis: s.nis, rombel_name: rombelNameById.get(s.rombel_id) ?? "-",
          H: x?.H ?? 0, S: x?.S ?? 0, I: x?.I ?? 0, A: x?.A ?? 0, P: x?.P ?? 0, total: tot, pct,
        };
      })
      .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));

    const alfaList = students
      .map((s) => {
        const x = perStud.get(s.id);
        return {
          student_id: s.id, name: s.name, nis: s.nis, rombel_name: rombelNameById.get(s.rombel_id) ?? "-",
          alfa: x?.A ?? 0, sakit: x?.S ?? 0, izin: x?.I ?? 0,
          dates: (x?.dates ?? []).sort(),
        };
      })
      .filter((r) => r.alfa > 0 || r.sakit > 0 || r.izin > 0)
      .sort((a, b) => b.alfa - a.alfa || a.name.localeCompare(b.name));

    // Terlambat range
    let terlambatCount = 0;
    const lateByStud = new Map<string, { count: number; dates: string[] }>();
    if (studentIds.length) {
      const { data: lateRows } = await supabase
        .from("late_records")
        .select("id, student_id, record_date")
        .in("student_id", studentIds)
        .gte("record_date", startDate)
        .lte("record_date", endDate);
      (lateRows ?? []).forEach((l: any) => {
        terlambatCount++;
        let x = lateByStud.get(l.student_id);
        if (!x) { x = { count: 0, dates: [] }; lateByStud.set(l.student_id, x); }
        x.count++;
        if (l.record_date) x.dates.push(l.record_date);
      });
    }
    const terlambatList = students
      .map((s) => {
        const x = lateByStud.get(s.id);
        return {
          student_id: s.id, name: s.name, nis: s.nis, rombel_name: rombelNameById.get(s.rombel_id) ?? "-",
          count: x?.count ?? 0, dates: (x?.dates ?? []).sort(),
        };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    // KBM
    const { data: jadwalRows } = await supabase
      .from("jadwal_pelajaran")
      .select("id, hari, rombel_id")
      .in("rombel_id", rombelIds);
    const jadwalPerHari = new Map<string, number>();
    (jadwalRows ?? []).forEach((j: any) => {
      const h = String(j.hari ?? "").toLowerCase();
      if (!h) return;
      jadwalPerHari.set(h, (jadwalPerHari.get(h) ?? 0) + 1);
    });
    const upTo = endDate < today ? endDate : (today < endDate ? today : endDate);
    const effectiveEnd = upTo < startDate ? startDate : upTo;
    const hariCount = new Map<string, number>();
    const startD = new Date(startDate + "T00:00:00");
    const endD = new Date(effectiveEnd + "T00:00:00");
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const name = HARI[d.getDay()];
      hariCount.set(name, (hariCount.get(name) ?? 0) + 1);
    }
    let jamScheduled = 0;
    jadwalPerHari.forEach((cnt, hari) => {
      jamScheduled += cnt * (hariCount.get(hari) ?? 0);
    });
    const { data: kbmRows } = await supabase
      .from("kbm_records")
      .select("id, status, tanggal, rombel_id")
      .in("rombel_id", rombelIds)
      .gte("tanggal", startDate)
      .lte("tanggal", endDate);
    let jamRealized = 0;
    const kbmPerRombel = new Map<string, { realized: number; total: number }>();
    (kbmRows ?? []).forEach((k: any) => {
      const st = String(k.status ?? "").toLowerCase();
      const done = st === "sudah" || st === "selesai" || st === "terealisasi";
      if (done) jamRealized++;
      const key = k.rombel_id;
      let x = kbmPerRombel.get(key);
      if (!x) { x = { realized: 0, total: 0 }; kbmPerRombel.set(key, x); }
      x.total++;
      if (done) x.realized++;
    });
    const kbmPct = jamScheduled > 0 ? Math.min(100, Math.round((jamRealized / jamScheduled) * 100)) : 0;
    const kbmList = rombels.map((r) => {
      const x = kbmPerRombel.get(r.id);
      return {
        rombel_id: r.id, rombel_name: r.name,
        realized: x?.realized ?? 0, total: x?.total ?? 0,
        pct: x && x.total > 0 ? Math.round((x.realized / x.total) * 100) : 0,
      };
    }).sort((a, b) => a.rombel_name.localeCompare(b.rombel_name));

    return {
      konsentrasi: data.konsentrasi,
      ...emptySemMeta,
      rombels: rombels.map((r) => ({ id: r.id, name: r.name, tingkat: r.tingkat })),
      totalRombel: rombels.length,
      totalSiswa: students.length,
      kehadiran: { H, S, I, A, P, total: totalPresensi, pct: kehadiranPct, list: kehadiranList },
      alfa: { total: A, sakit: S, izin: I, list: alfaList },
      terlambat: { total: terlambatCount, list: terlambatList },
      kbm: { realized: jamRealized, scheduled: jamScheduled, pct: kbmPct, list: kbmList },
    };
  });

function emptyResult(
  konsentrasi: string,
  meta: {
    semester: { id: string; nama: string | null; tanggal_mulai: string | null; tanggal_selesai: string | null } | null;
    tahunAjaran: { id: string; nama: string | null } | null;
    range: { startDate: string; endDate: string };
  },
) {
  return {
    konsentrasi,
    ...meta,
    rombels: [] as { id: string; name: string; tingkat: string | null }[],
    totalRombel: 0,
    totalSiswa: 0,
    kehadiran: { H: 0, S: 0, I: 0, A: 0, P: 0, total: 0, pct: 0, list: [] as any[] },
    alfa: { total: 0, sakit: 0, izin: 0, list: [] as any[] },
    terlambat: { total: 0, list: [] as any[] },
    kbm: { realized: 0, scheduled: 0, pct: 0, list: [] as any[] },
  };
}
