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

export const listRombelForDashboardKelas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const allowed = await getAllowedRombelIds(supabase, userId);
    let q = supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian, is_khusus")
      .order("name");
    if (allowed !== null) {
      if (allowed.length === 0) return [] as any[];
      q = q.in("id", allowed);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDashboardKelas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid(),
      date: z.string().optional(), // YYYY-MM-DD
      bulan: z.number().int().min(1).max(12).optional(),
      tahun: z.number().int().optional(),
      startDate: z.string().optional(), // recap range start (overrides bulan/tahun)
      endDate: z.string().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const allowed = await getAllowedRombelIds(supabase, userId);
    if (allowed !== null && !allowed.includes(data.rombelId)) {
      throw new Error("Forbidden: Anda tidak memiliki akses ke rombel ini");
    }

    const now = new Date();
    const tanggal = data.date ?? now.toISOString().slice(0, 10);
    const dateObj = new Date(tanggal + "T00:00:00");
    const hariNama = HARI[dateObj.getDay()];
    const bulan = data.bulan ?? dateObj.getMonth() + 1;
    const tahun = data.tahun ?? dateObj.getFullYear();

    // Active semester (for UI bounds & clamping custom range)
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

    // Recap period range: prefer explicit startDate/endDate; else bulan/tahun
    let monthStart: string;
    let monthEnd: string;
    if (data.startDate && data.endDate) {
      monthStart = data.startDate;
      monthEnd = data.endDate;
    } else {
      monthStart = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
      const monthEndDate = new Date(tahun, bulan, 0);
      monthEnd = `${tahun}-${String(bulan).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
    }


    // Rombel
    const { data: rombel, error: rerr } = await supabase
      .from("rombel")
      .select("*")
      .eq("id", data.rombelId)
      .maybeSingle();
    if (rerr) throw new Error(rerr.message);
    if (!rombel) throw new Error("Rombel tidak ditemukan");

    // Students
    const { data: studentsRaw } = await supabase
      .from("students")
      .select("id, name, nis, nisn, gender")
      .eq("rombel_id", data.rombelId)
      .order("name");
    const students = (studentsRaw ?? []) as any[];
    const totalL = students.filter((s) => String(s.gender ?? "").toUpperCase().startsWith("L")).length;
    const totalP = students.filter((s) => String(s.gender ?? "").toUpperCase().startsWith("P")).length;
    const studentIds = students.map((s) => s.id);

    // Today attendance
    const { data: todayRecs } = await supabase
      .from("attendance_records")
      .select("id, date")
      .eq("rombel_id", data.rombelId)
      .eq("date", tanggal);
    const todayRecIds = (todayRecs ?? []).map((r: any) => r.id);
    const { data: todayDetails } = todayRecIds.length
      ? await supabase
          .from("attendance_details")
          .select("student_id, status")
          .in("attendance_record_id", todayRecIds)
      : { data: [] as any[] };
    const todayMap = new Map<string, string>();
    (todayDetails ?? []).forEach((d: any) => {
      if (d.student_id) todayMap.set(d.student_id, normalizeStatus(d.status));
    });
    let tHadir = 0, tSakit = 0, tIzin = 0, tAlfa = 0, tPkl = 0;
    todayMap.forEach((s) => {
      if (s === "H") tHadir++;
      else if (s === "S") tSakit++;
      else if (s === "I") tIzin++;
      else if (s === "A") tAlfa++;
      else if (s === "P") tPkl++;
    });
    const kehadiranHariIni = students.map((s) => ({
      id: s.id,
      name: s.name,
      nis: s.nis,
      gender: s.gender,
      status: todayMap.get(s.id) ?? null,
    }));

    // Monthly recap per student
    const { data: monthRecs } = await supabase
      .from("attendance_records")
      .select("id, date")
      .eq("rombel_id", data.rombelId)
      .gte("date", monthStart)
      .lte("date", monthEnd);
    const monthRecIds = (monthRecs ?? []).map((r: any) => r.id);
    const dateMap = new Map<string, string>((monthRecs ?? []).map((r: any) => [r.id, r.date]));
    const { data: monthDetails } = monthRecIds.length
      ? await supabase
          .from("attendance_details")
          .select("attendance_record_id, student_id, status")
          .in("attendance_record_id", monthRecIds)
      : { data: [] as any[] };
    const perStudent = new Map<string, { H: number; S: number; I: number; A: number; P: number }>();
    students.forEach((s) => perStudent.set(s.id, { H: 0, S: 0, I: 0, A: 0, P: 0 }));
    // weekly trend (Sen..Sab of current week around `tanggal`)
    const weekStart = new Date(dateObj);
    const day = weekStart.getDay(); // 0..6
    const diffToMon = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMon);
    const weekDays: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekDays.push(d.toISOString().slice(0, 10));
    }
    const weeklyTrend = weekDays.map((d) => ({
      day: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][weekDays.indexOf(d)],
      date: d,
      H: 0, S: 0, I: 0, A: 0, P: 0,
    }));
    (monthDetails ?? []).forEach((d: any) => {
      const s = normalizeStatus(d.status);
      const bucket = perStudent.get(d.student_id);
      if (bucket && (s === "H" || s === "S" || s === "I" || s === "A" || s === "P")) {
        (bucket as any)[s]++;
      }
      const recDate = dateMap.get(d.attendance_record_id);
      if (recDate) {
        const idx = weekDays.indexOf(recDate);
        if (idx >= 0 && (s === "H" || s === "S" || s === "I" || s === "A" || s === "P")) {
          (weeklyTrend[idx] as any)[s]++;
        }
      }
    });
    const rekapKehadiran = students.map((s) => {
      const b = perStudent.get(s.id) ?? { H: 0, S: 0, I: 0, A: 0, P: 0 };
      const total = b.H + b.S + b.I + b.A + b.P;
      return {
        id: s.id,
        name: s.name,
        nis: s.nis,
        H: b.H, S: b.S, I: b.I, A: b.A, P: b.P,
        persen: total > 0 ? Math.round((b.H / total) * 100) : 0,
      };
    });
    const distribusi = rekapKehadiran.reduce(
      (acc, r) => {
        acc.H += r.H; acc.S += r.S; acc.I += r.I; acc.A += r.A; acc.P += r.P;
        return acc;
      },
      { H: 0, S: 0, I: 0, A: 0, P: 0 },
    );

    // Late records - all time & this month
    let keterlambatanBulanIni: any[] = [];
    let keterlambatanTotal = 0;
    if (studentIds.length) {
      const { count: totalLate } = await supabase
        .from("late_records")
        .select("id", { count: "exact", head: true })
        .in("student_id", studentIds);
      keterlambatanTotal = totalLate ?? 0;
      const { data: lateRows } = await supabase
        .from("late_records")
        .select("id, student_id, record_date, recorded_at")
        .in("student_id", studentIds)
        .gte("record_date", monthStart)
        .lte("record_date", monthEnd)
        .order("record_date", { ascending: false });
      const sMap = new Map(students.map((s) => [s.id, s]));
      keterlambatanBulanIni = (lateRows ?? []).map((r: any) => {
        const st: any = sMap.get(r.student_id);
        return {
          id: r.id,
          student_id: r.student_id,
          name: st?.name ?? "—",
          nis: st?.nis ?? "—",
          record_date: r.record_date,
          recorded_at: r.recorded_at,
        };
      });
    }
    const terlambatHariIni = keterlambatanBulanIni.filter((r) => r.record_date === tanggal).length;

    // Jadwal hari ini + minggu
    const { data: jadwalAll } = await supabase
      .from("jadwal_pelajaran")
      .select("id, hari, jam_ke, jam_mulai, jam_selesai, mata_pelajaran_id, guru_id")
      .eq("rombel_id", data.rombelId);
    const mapelIds = [...new Set((jadwalAll ?? []).map((j: any) => j.mata_pelajaran_id).filter(Boolean))];
    const guruIds = [...new Set((jadwalAll ?? []).map((j: any) => j.guru_id).filter(Boolean))];
    const [mpRes, grRes] = await Promise.all([
      mapelIds.length
        ? supabase.from("mata_pelajaran").select("id, nama, kode").in("id", mapelIds)
        : Promise.resolve({ data: [] as any[] }),
      guruIds.length
        ? supabase.from("guru").select("id, nama, nip").in("id", guruIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const mMap = new Map((mpRes.data ?? []).map((m: any) => [m.id, m]));
    const gMap = new Map((grRes.data ?? []).map((g: any) => [g.id, g]));

    // KBM status today
    const { data: kbmToday } = await supabase
      .from("kbm_records")
      .select("mata_pelajaran_id, status, tanggal")
      .eq("rombel_id", data.rombelId)
      .eq("tanggal", tanggal);
    const kbmMapelToday = new Map<string, string>();
    (kbmToday ?? []).forEach((k: any) => {
      if (k.mata_pelajaran_id) kbmMapelToday.set(k.mata_pelajaran_id, String(k.status ?? "belum"));
    });

    const mapJadwal = (j: any) => {
      const m: any = j.mata_pelajaran_id ? mMap.get(j.mata_pelajaran_id) : null;
      const g: any = j.guru_id ? gMap.get(j.guru_id) : null;
      return {
        id: j.id,
        hari: String(j.hari ?? "").toLowerCase(),
        jam_ke: j.jam_ke,
        jam_mulai: j.jam_mulai,
        jam_selesai: j.jam_selesai,
        mapel: m?.nama ?? "—",
        kode: m?.kode ?? "—",
        guru: g?.nama ?? "—",
        kbm_status: j.mata_pelajaran_id ? kbmMapelToday.get(j.mata_pelajaran_id) ?? "belum" : "belum",
      };
    };
    const jadwalHariIni = (jadwalAll ?? [])
      .filter((j: any) => String(j.hari ?? "").toLowerCase() === hariNama)
      .map(mapJadwal)
      .sort((a: any, b: any) => (a.jam_ke ?? 0) - (b.jam_ke ?? 0));
    const jadwalMingguan = (jadwalAll ?? [])
      .map(mapJadwal)
      .sort((a: any, b: any) => {
        const order = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
        return (order.indexOf(a.hari) - order.indexOf(b.hari)) || ((a.jam_ke ?? 0) - (b.jam_ke ?? 0));
      });

    // SP status
    let spRows: any[] = [];
    if (studentIds.length) {
      const { data: sp } = await supabase
        .from("sp_records")
        .select("id, student_id, sp_level, tanggal_rekaman, alasan")
        .in("student_id", studentIds)
        .order("tanggal_rekaman", { ascending: false });
      spRows = sp ?? [];
    }
    const maxSpByStudent = new Map<string, { level: number; tanggal: string | null; alasan: string | null }>();
    spRows.forEach((r: any) => {
      const prev = maxSpByStudent.get(r.student_id);
      if (!prev || (r.sp_level ?? 0) > prev.level) {
        maxSpByStudent.set(r.student_id, { level: r.sp_level ?? 0, tanggal: r.tanggal_rekaman, alasan: r.alasan });
      }
    });
    const spSiswa = students
      .map((s) => {
        const info = maxSpByStudent.get(s.id);
        return info && info.level > 0
          ? { id: s.id, name: s.name, nis: s.nis, level: info.level, tanggal: info.tanggal, alasan: info.alasan }
          : null;
      })
      .filter(Boolean) as any[];
    const sp1 = spSiswa.filter((r) => r.level === 1).length;
    const sp2 = spSiswa.filter((r) => r.level === 2).length;
    const sp3 = spSiswa.filter((r) => r.level >= 3).length;

    return {
      rombel: {
        id: rombel.id,
        name: rombel.name,
        tingkat: rombel.tingkat,
        konsentrasi_keahlian: rombel.konsentrasi_keahlian,
        wali_kelas_name: rombel.wali_kelas_name,
        wali_kelas_nip: rombel.wali_kelas_nip,
        is_khusus: rombel.is_khusus,
      },
      totalSiswa: students.length,
      totalL,
      totalP,
      periode: { tanggal, bulan, tahun, monthStart, monthEnd, hariNama },
      students,
      kehadiranHariIni,
      todaySummary: { H: tHadir, S: tSakit, I: tIzin, A: tAlfa, P: tPkl, terlambat: terlambatHariIni },
      rekapKehadiran,
      distribusi,
      weeklyTrend,
      keterlambatan: {
        total: keterlambatanTotal,
        bulanIni: keterlambatanBulanIni,
      },
      jadwalHariIni,
      jadwalMingguan,
      sp: { sp1, sp2, sp3, list: spSiswa },
    };
  });
