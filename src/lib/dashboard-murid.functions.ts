import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function isStaff(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function getSelfNis(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("nis").eq("id", userId).maybeSingle();
  return (data?.nis ?? null) as string | null;
}

export const listSiswaForDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const staff = await isStaff(supabase, userId);

    let query = supabase.from("students").select("id, name, nis, rombel_id").order("name").limit(3000);
    if (!staff) {
      const nis = await getSelfNis(supabase, userId);
      if (!nis) return { isStaff: false, rows: [], rombelOptions: [] };
      query = query.eq("nis", nis);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const students = data ?? [];
    const rombelIds = [...new Set(students.map((s: any) => s.rombel_id).filter(Boolean))] as string[];
    const { data: rombelRows } = rombelIds.length
      ? await supabase.from("rombel").select("id, name").in("id", rombelIds)
      : { data: [] as any[] };
    const rMap = new Map((rombelRows ?? []).map((r: any) => [r.id, r.name]));
    const rows = students.map((s: any) => ({
      id: s.id,
      name: s.name ?? "—",
      nis: s.nis ?? "—",
      rombel_id: s.rombel_id,
      rombel_name: s.rombel_id ? rMap.get(s.rombel_id) ?? "—" : "—",
    }));
    const rombelOptions = (rombelRows ?? [])
      .map((r: any) => ({ id: r.id, name: r.name }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    return { isStaff: staff, rows, rombelOptions };
  });

export const getSiswaDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      studentId: z.string().uuid(),
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const staff = await isStaff(supabase, userId);

    const { data: student, error: serr } = await supabase
      .from("students")
      .select("*")
      .eq("id", data.studentId)
      .maybeSingle();
    if (serr) throw new Error(serr.message);
    if (!student) throw new Error("Siswa tidak ditemukan");

    if (!staff) {
      const selfNis = await getSelfNis(supabase, userId);
      if (!selfNis || selfNis !== student.nis) throw new Error("Forbidden");
    }

    const now = new Date();
    const year = data.year ?? now.getFullYear();
    const month = data.month ?? now.getMonth() + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEndDate = new Date(year, month, 0);
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;

    // rombel + wali kelas
    const { data: rombel } = student.rombel_id
      ? await supabase.from("rombel").select("*").eq("id", student.rombel_id).maybeSingle()
      : { data: null };

    // mata pelajaran & guru pengampu di rombel siswa
    let mapelRows: any[] = [];
    if (student.rombel_id) {
      const { data: rmp } = await supabase
        .from("rombel_mata_pelajaran")
        .select("mata_pelajaran_id, guru_id")
        .eq("rombel_id", student.rombel_id)
        .is("deleted_at", null);
      const mapelIds = [...new Set((rmp ?? []).map((r: any) => r.mata_pelajaran_id).filter(Boolean))];
      const guruIds = [...new Set((rmp ?? []).map((r: any) => r.guru_id).filter(Boolean))];
      const [mp, gr] = await Promise.all([
        mapelIds.length
          ? supabase.from("mata_pelajaran").select("id, nama, kode").in("id", mapelIds)
          : Promise.resolve({ data: [] as any[] }),
        guruIds.length
          ? supabase.from("guru").select("id, nama, nip").in("id", guruIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const mMap = new Map((mp.data ?? []).map((m: any) => [m.id, m]));
      const gMap = new Map((gr.data ?? []).map((g: any) => [g.id, g]));
      mapelRows = (rmp ?? []).map((r: any) => {
        const m: any = r.mata_pelajaran_id ? mMap.get(r.mata_pelajaran_id) : null;
        const g: any = r.guru_id ? gMap.get(r.guru_id) : null;
        return {
          mapel: m?.nama ?? "—",
          kode: m?.kode ?? "—",
          guru: g?.nama ?? "—",
          nip: g?.nip ?? "—",
        };
      }).sort((a, b) => a.mapel.localeCompare(b.mapel));
    }

    // Presensi bulan berjalan
    let hadir = 0, sakit = 0, izin = 0, alfa = 0;
    const riwayat: { date: string; status: string }[] = [];
    if (student.rombel_id) {
      const { data: recs } = await supabase
        .from("attendance_records")
        .select("id, date")
        .eq("rombel_id", student.rombel_id)
        .gte("date", monthStart)
        .lte("date", monthEnd);
      const recIds = (recs ?? []).map((r: any) => r.id);
      const dateMap = new Map((recs ?? []).map((r: any) => [r.id, r.date]));
      if (recIds.length) {
        const { data: dets } = await supabase
          .from("attendance_details")
          .select("attendance_record_id, status")
          .in("attendance_record_id", recIds)
          .eq("student_id", data.studentId);
        (dets ?? []).forEach((d: any) => {
          if (d.status === "H") hadir++;
          else if (d.status === "S") sakit++;
          else if (d.status === "I") izin++;
          else if (d.status === "A") alfa++;
          riwayat.push({ date: dateMap.get(d.attendance_record_id) as string, status: d.status });
        });
      }
    }
    riwayat.sort((a, b) => (a.date < b.date ? 1 : -1));
    const totalPresensi = hadir + sakit + izin + alfa;
    const persenHadir = totalPresensi > 0 ? Math.round((hadir / totalPresensi) * 100) : 0;

    // Akumulasi total alfa & terlambat (all time)
    const [alfaAllRes, lateAllRes, spRes] = await Promise.all([
      supabase
        .from("attendance_details")
        .select("id", { count: "exact", head: true })
        .eq("student_id", data.studentId)
        .eq("status", "A"),
      supabase
        .from("late_records")
        .select("id", { count: "exact", head: true })
        .eq("student_id", data.studentId),
      supabase
        .from("sp_records")
        .select("id, sp_level, tanggal_rekaman, alasan")
        .eq("student_id", data.studentId)
        .order("tanggal_rekaman", { ascending: false }),
    ]);
    const alfaTotal = alfaAllRes.count ?? 0;
    const terlambatTotal = lateAllRes.count ?? 0;
    const spList = (spRes.data ?? []) as any[];
    const currentSp = spList.reduce((m: number, r: any) => Math.max(m, r.sp_level ?? 0), 0);

    // Teman sekelas
    let teman: { id: string; name: string; nis: string }[] = [];
    if (student.rombel_id) {
      const { data: mates } = await supabase
        .from("students")
        .select("id, name, nis")
        .eq("rombel_id", student.rombel_id)
        .neq("id", data.studentId)
        .order("name");
      teman = (mates ?? []).map((s: any) => ({ id: s.id, name: s.name ?? "—", nis: s.nis ?? "—" }));
    }

    return {
      isStaff: staff,
      student: {
        id: student.id,
        name: student.name,
        nis: student.nis,
        nisn: student.nisn,
        gender: student.gender,
        rombel_id: student.rombel_id,
      },
      rombel: rombel
        ? {
            id: rombel.id,
            name: rombel.name,
            tingkat: rombel.tingkat,
            konsentrasi_keahlian: rombel.konsentrasi_keahlian,
            wali_kelas_name: rombel.wali_kelas_name,
            wali_kelas_nip: rombel.wali_kelas_nip,
          }
        : null,
      periode: { year, month, monthStart, monthEnd },
      presensi: { hadir, sakit, izin, alfa, persenHadir, riwayat },
      mapel: mapelRows,
      sp: {
        currentLevel: currentSp,
        alfaTotal,
        terlambatTotal,
        list: spList.slice(0, 10),
      },
      teman,
    };
  });
