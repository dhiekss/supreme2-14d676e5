import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const HARI_MAP = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function getSelfNip(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("nip").eq("id", userId).maybeSingle();
  return (data?.nip ?? null) as string | null;
}

export const listGuruForDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    let query = supabase.from("guru").select("id, nama, nip").order("nama");
    if (!admin) {
      const nip = await getSelfNip(supabase, userId);
      if (!nip) return { isAdmin: false, rows: [] };
      query = query.eq("nip", nip);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { isAdmin: admin, rows: data ?? [] };
  });

export const getGuruDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ guruId: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);

    const { data: guru, error: gerr } = await supabase
      .from("guru")
      .select("*")
      .eq("id", data.guruId)
      .maybeSingle();
    if (gerr) throw new Error(gerr.message);
    if (!guru) throw new Error("Guru tidak ditemukan");

    // authorization: non-admin can only view own guru (by nip)
    if (!admin) {
      const selfNip = await getSelfNip(supabase, userId);
      if (!selfNip || selfNip !== guru.nip) {
        throw new Error("Forbidden: hanya bisa melihat dashboard sendiri");
      }
    }

    const today = new Date();
    const hariName = HARI_MAP[today.getDay()];
    const todayIso = today.toISOString().slice(0, 10);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const thirtyAgo = new Date(today.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

    const [mapel, jadwalAll, rmp, berkas, activeSem, waliRombel] = await Promise.all([
      guru.mata_pelajaran_id
        ? supabase.from("mata_pelajaran").select("id, nama").eq("id", guru.mata_pelajaran_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("jadwal_pelajaran").select("*").eq("guru_id", data.guruId),
      supabase.from("rombel_mata_pelajaran").select("*").eq("guru_id", data.guruId).is("deleted_at", null),
      supabase.from("berkas_pembelajaran").select("*").eq("guru_id", data.guruId),
      supabase.from("semester").select("id, nama").eq("is_active", true).maybeSingle(),
      guru.nip
        ? supabase.from("rombel").select("id, name").eq("wali_kelas_nip", guru.nip)
        : Promise.resolve({ data: [] }),
    ]);

    const jadwalList = (jadwalAll.data ?? []) as any[];
    const jadwalToday = jadwalList
      .filter((j) => (j.hari ?? "").toLowerCase() === hariName.toLowerCase())
      .sort((a, b) => (a.jam_ke ?? 0) - (b.jam_ke ?? 0));

    // rombel + mapel lookups
    const rombelIds = [
      ...new Set([
        ...jadwalList.map((j) => j.rombel_id),
        ...(rmp.data ?? []).map((x: any) => x.rombel_id),
      ].filter(Boolean)),
    ] as string[];
    const mapelIds = [
      ...new Set([
        ...jadwalList.map((j) => j.mata_pelajaran_id),
        ...(rmp.data ?? []).map((x: any) => x.mata_pelajaran_id),
      ].filter(Boolean)),
    ] as string[];

    const [rombelRows, mapelRows] = await Promise.all([
      rombelIds.length
        ? supabase.from("rombel").select("id, name, konsentrasi_keahlian").in("id", rombelIds)
        : Promise.resolve({ data: [] }),
      mapelIds.length
        ? supabase.from("mata_pelajaran").select("id, nama").in("id", mapelIds)
        : Promise.resolve({ data: [] }),
    ]);
    const rMap = new Map((rombelRows.data ?? []).map((r: any) => [r.id, r]));
    const mMap = new Map((mapelRows.data ?? []).map((m: any) => [m.id, m.nama]));

    // KBM status for today's schedule
    const { data: kbmToday } = await supabase
      .from("kbm_records")
      .select("rombel_id, mata_pelajaran_id, jam_pelajaran, status")
      .eq("guru_id", data.guruId)
      .eq("tanggal", todayIso);

    const kbmSet = new Set(
      (kbmToday ?? []).flatMap((k: any) => {
        const jams: number[] = Array.isArray(k.jam_pelajaran) ? k.jam_pelajaran.map(Number) : [];
        return jams.map((jp) => `${k.rombel_id}|${jp}`);
      }),
    );

    const jadwalTodayEnriched = jadwalToday.map((j) => {
      const r: any = j.rombel_id ? rMap.get(j.rombel_id) : null;
      return {
        id: j.id,
        jam_ke: j.jam_ke,
        jam_mulai: j.jam_mulai,
        jam_selesai: j.jam_selesai,
        rombel_name: r?.name ?? "—",
        mapel_nama: j.mata_pelajaran_id ? mMap.get(j.mata_pelajaran_id) ?? "—" : "—",
        sudah_input: kbmSet.has(`${j.rombel_id}|${Number(j.jam_ke)}`),
      };
    });

    // kelas diampu (unique rombel from rmp+jadwal)
    const kelasIds = [
      ...new Set([
        ...jadwalList.map((j) => j.rombel_id),
        ...(rmp.data ?? []).map((x: any) => x.rombel_id),
      ].filter(Boolean)),
    ] as string[];

    const { data: studentsCount } = kelasIds.length
      ? await supabase.from("students").select("id, rombel_id").in("rombel_id", kelasIds)
      : { data: [] as any[] };
    const countByRombel = new Map<string, number>();
    (studentsCount ?? []).forEach((s: any) => {
      countByRombel.set(s.rombel_id, (countByRombel.get(s.rombel_id) ?? 0) + 1);
    });

    const kelasDiampu = kelasIds.map((id) => {
      const r: any = rMap.get(id);
      const rmpRow: any = (rmp.data ?? []).find((x: any) => x.rombel_id === id);
      const mapelId = rmpRow?.mata_pelajaran_id ?? guru.mata_pelajaran_id;
      return {
        id,
        name: r?.name ?? "—",
        konsentrasi: r?.konsentrasi_keahlian ?? "",
        mapel: mapelId ? mMap.get(mapelId) ?? ((mapel as any).data?.nama ?? "—") : ((mapel as any).data?.nama ?? "—"),
        siswa: countByRombel.get(id) ?? 0,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // Realisasi KBM bulan ini: jam terpakai / jam terjadwal bulan ini
    // approx: count kbm rows this month with jam_pelajaran length
    const { data: kbmMonth } = await supabase
      .from("kbm_records")
      .select("tanggal, jam_pelajaran, status")
      .eq("guru_id", data.guruId)
      .gte("tanggal", monthStart)
      .lte("tanggal", todayIso);
    const jamRealisasi = (kbmMonth ?? []).reduce((sum: number, k: any) => {
      const jams: any[] = Array.isArray(k.jam_pelajaran) ? k.jam_pelajaran : [];
      return sum + jams.length;
    }, 0);
    // jadwal per week jam count
    const jamPerWeek = jadwalList.length;
    // approximate weekdays elapsed this month (Mon-Sat)
    let workingDays = 0;
    for (let d = new Date(monthStart); d <= today; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) workingDays++;
    }
    const jamTerjadwal = Math.round((jamPerWeek / 6) * workingDays);
    const persenKBM = jamTerjadwal > 0 ? Math.min(100, Math.round((jamRealisasi / jamTerjadwal) * 100)) : 0;

    // Berkas administrasi: hitung kelengkapan (3 field: prota_promes/prota, atp/analisis, modul_ajar)
    const berkasRows = (berkas.data ?? []) as any[];
    const berkasValid = berkasRows.filter((b) =>
      (b.prota_promes_link || b.prota_link) && (b.atp_link || b.analisis_cp_atp_link) && b.modul_ajar_link,
    ).length;
    const berkasTotal = (rmp.data ?? []).length || berkasRows.length;

    // Siswa alfa 30 hari terakhir untuk kelas yang diampu
    let alfaList: { student_id: string; name: string; rombel: string; count: number }[] = [];
    if (kelasIds.length) {
      const { data: recs } = await supabase
        .from("attendance_records")
        .select("id, date, rombel_id")
        .in("rombel_id", kelasIds)
        .gte("date", thirtyAgo);
      const recIds = (recs ?? []).map((r: any) => r.id);
      if (recIds.length) {
        const { data: dets } = await supabase
          .from("attendance_details")
          .select("student_id, status, attendance_record_id")
          .in("attendance_record_id", recIds)
          .eq("status", "A");
        const cnt = new Map<string, number>();
        (dets ?? []).forEach((d: any) => cnt.set(d.student_id, (cnt.get(d.student_id) ?? 0) + 1));
        const sids = [...cnt.keys()];
        if (sids.length) {
          const { data: sts } = await supabase
            .from("students")
            .select("id, name, rombel_id")
            .in("id", sids);
          alfaList = (sts ?? []).map((s: any) => ({
            student_id: s.id,
            name: s.name,
            rombel: (rMap.get(s.rombel_id) as any)?.name ?? "—",
            count: cnt.get(s.id) ?? 0,
          })).sort((a, b) => b.count - a.count);
        }
      }
    }

    // Siswa terlambat bulan ini
    let terlambatList: { student_id: string; name: string; rombel: string; count: number }[] = [];
    if (kelasIds.length) {
      const { data: lates } = await supabase
        .from("late_records")
        .select("student_id, rombel_id, record_date")
        .in("rombel_id", kelasIds)
        .gte("record_date", monthStart);
      const cnt = new Map<string, number>();
      (lates ?? []).forEach((l: any) => cnt.set(l.student_id, (cnt.get(l.student_id) ?? 0) + 1));
      const sids = [...cnt.keys()];
      if (sids.length) {
        const { data: sts } = await supabase.from("students").select("id, name, rombel_id").in("id", sids);
        terlambatList = (sts ?? []).map((s: any) => ({
          student_id: s.id,
          name: s.name,
          rombel: (rMap.get(s.rombel_id) as any)?.name ?? "—",
          count: cnt.get(s.id) ?? 0,
        })).sort((a, b) => b.count - a.count);
      }
    }

    // Rekomendasi SP: alfa>3 atau terlambat>5
    const rekMap = new Map<string, { student_id: string; name: string; rombel: string; alfa: number; terlambat: number }>();
    alfaList.forEach((a) => {
      if (a.count > 3) rekMap.set(a.student_id, { student_id: a.student_id, name: a.name, rombel: a.rombel, alfa: a.count, terlambat: 0 });
    });
    terlambatList.forEach((t) => {
      const existing = rekMap.get(t.student_id);
      if (existing) existing.terlambat = t.count;
      else if (t.count > 5) rekMap.set(t.student_id, { student_id: t.student_id, name: t.name, rombel: t.rombel, alfa: 0, terlambat: t.count });
    });
    const rekomendasiSp = [...rekMap.values()];

    return {
      isAdmin: admin,
      guru: {
        id: guru.id,
        nama: guru.nama,
        nip: guru.nip,
        jenis_kelamin: guru.jenis_kelamin,
        kelompok_mapel: guru.kelompok_mapel,
        kualifikasi_pendidikan: guru.kualifikasi_pendidikan,
        no_whatsapp: guru.no_whatsapp,
        mapel_nama: (mapel as any).data?.nama ?? "—",
      },
      waliKelas: (waliRombel.data ?? []).map((r: any) => r.name),
      today: {
        hari: hariName,
        tanggal: todayIso,
        jamHariIni: jadwalToday.length,
      },
      stats: {
        persenKBM,
        jamRealisasi,
        jamTerjadwal,
        kelasDiampu: kelasIds.length,
        berkasValid,
        berkasTotal,
      },
      jadwalHariIni: jadwalTodayEnriched,
      kelasDiampu,
      alfaList: alfaList.slice(0, 10),
      terlambatList: terlambatList.slice(0, 10),
      rekomendasiSp,
      activeSemesterNama: (activeSem as any).data?.nama ?? null,
    };
  });
