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
      date: z.string().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const allowed = await getAllowedRombelIds(supabase, userId);

    const now = new Date();
    const tanggal = data.date ?? now.toISOString().slice(0, 10);
    const dateObj = new Date(tanggal + "T00:00:00");
    const bulan = dateObj.getMonth() + 1;
    const tahun = dateObj.getFullYear();
    const monthStart = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
    const monthEndDate = new Date(tahun, bulan, 0);
    const monthEnd = `${tahun}-${String(bulan).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;

    // Rombel dalam konsentrasi (respecting akses)
    let rq = supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian")
      .eq("konsentrasi_keahlian", data.konsentrasi)
      .order("name");
    if (allowed !== null) {
      if (allowed.length === 0) {
        return emptyResult(data.konsentrasi, tanggal, bulan, tahun);
      }
      rq = rq.in("id", allowed);
    }
    const { data: rombelRows, error: rerr } = await rq;
    if (rerr) throw new Error(rerr.message);
    const rombels = (rombelRows ?? []) as any[];
    if (rombels.length === 0) return emptyResult(data.konsentrasi, tanggal, bulan, tahun);
    const rombelIds = rombels.map((r) => r.id);

    // Students
    const { data: studentsRaw } = await supabase
      .from("students")
      .select("id, name, nis, rombel_id")
      .in("rombel_id", rombelIds);
    const students = (studentsRaw ?? []) as any[];
    const studentIds = students.map((s) => s.id);

    // Attendance bulan ini
    const { data: monthRecs } = await supabase
      .from("attendance_records")
      .select("id, date, rombel_id")
      .in("rombel_id", rombelIds)
      .gte("date", monthStart)
      .lte("date", monthEnd);
    const recIds = (monthRecs ?? []).map((r: any) => r.id);
    const { data: dets } = recIds.length
      ? await supabase
          .from("attendance_details")
          .select("student_id, status, attendance_record_id")
          .in("attendance_record_id", recIds)
      : { data: [] as any[] };
    let H = 0, S = 0, I = 0, A = 0, P = 0;
    (dets ?? []).forEach((d: any) => {
      const st = normalizeStatus(d.status);
      if (st === "H") H++;
      else if (st === "S") S++;
      else if (st === "I") I++;
      else if (st === "A") A++;
      else if (st === "P") P++;
    });
    const totalPresensi = H + S + I + A + P;
    const kehadiranPct = totalPresensi > 0 ? Math.round((H / totalPresensi) * 100) : 0;

    // Terlambat bulan ini
    let terlambatCount = 0;
    if (studentIds.length) {
      const { count } = await supabase
        .from("late_records")
        .select("id", { count: "exact", head: true })
        .in("student_id", studentIds)
        .gte("record_date", monthStart)
        .lte("record_date", monthEnd);
      terlambatCount = count ?? 0;
    }

    // KBM realisasi bulan ini
    const { data: jadwalRows } = await supabase
      .from("jadwal_pelajaran")
      .select("id, hari")
      .in("rombel_id", rombelIds);
    const jadwalPerHari = new Map<string, number>();
    (jadwalRows ?? []).forEach((j: any) => {
      const h = String(j.hari ?? "").toLowerCase();
      if (!h) return;
      jadwalPerHari.set(h, (jadwalPerHari.get(h) ?? 0) + 1);
    });
    // hitung jumlah hari (per nama hari) yang sudah lewat / berjalan dalam bulan aktif sampai dengan `tanggal`
    const upTo = tanggal < monthEnd ? tanggal : monthEnd;
    const hariCount = new Map<string, number>();
    const startD = new Date(monthStart + "T00:00:00");
    const endD = new Date(upTo + "T00:00:00");
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
      .select("id, status")
      .in("rombel_id", rombelIds)
      .gte("tanggal", monthStart)
      .lte("tanggal", monthEnd);
    let jamRealized = 0;
    (kbmRows ?? []).forEach((k: any) => {
      const st = String(k.status ?? "").toLowerCase();
      if (st === "sudah" || st === "selesai" || st === "terealisasi") jamRealized++;
    });
    const kbmPct = jamScheduled > 0 ? Math.min(100, Math.round((jamRealized / jamScheduled) * 100)) : 0;

    return {
      konsentrasi: data.konsentrasi,
      periode: { tanggal, bulan, tahun, monthStart, monthEnd },
      rombels: rombels.map((r) => ({ id: r.id, name: r.name, tingkat: r.tingkat })),
      totalRombel: rombels.length,
      totalSiswa: students.length,
      kehadiran: { H, S, I, A, P, total: totalPresensi, pct: kehadiranPct },
      alfa: { total: A, sakit: S, izin: I },
      terlambat: { total: terlambatCount },
      kbm: { realized: jamRealized, scheduled: jamScheduled, pct: kbmPct },
    };
  });

function emptyResult(konsentrasi: string, tanggal: string, bulan: number, tahun: number) {
  return {
    konsentrasi,
    periode: {
      tanggal, bulan, tahun,
      monthStart: `${tahun}-${String(bulan).padStart(2, "0")}-01`,
      monthEnd: tanggal,
    },
    rombels: [] as { id: string; name: string; tingkat: string | null }[],
    totalRombel: 0,
    totalSiswa: 0,
    kehadiran: { H: 0, S: 0, I: 0, A: 0, P: 0, total: 0, pct: 0 },
    alfa: { total: 0, sakit: 0, izin: 0 },
    terlambat: { total: 0 },
    kbm: { realized: 0, scheduled: 0, pct: 0 },
  };
}
