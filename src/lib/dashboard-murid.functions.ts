import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAllowedRombelIds } from "@/lib/rombel-access";
import { z } from "zod";

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "superadmin"])
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
    } else {
      // Non-admin staff: batasi berdasarkan Akses Rombel (user_rombel + wali kelas).
      const allowed = await getAllowedRombelIds(supabase, userId);
      if (allowed !== null) {
        if (allowed.length === 0) {
          // Tidak ada akses rombel — fallback ke murid milik sendiri (jika NIS-nya cocok).
          const nis = await getSelfNis(supabase, userId);
          if (!nis) return { isStaff: true, rows: [], rombelOptions: [] };
          query = query.eq("nis", nis);
        } else {
          query = query.in("rombel_id", allowed);
        }
      }
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
      mode: z.enum(["bulan", "semester"]).optional(),
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
      semesterId: z.string().uuid().optional(),
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
    if (!student) throw new Error("Murid tidak ditemukan");

    if (!staff) {
      const selfNis = await getSelfNis(supabase, userId);
      if (!selfNis || selfNis !== student.nis) throw new Error("Forbidden");
    }

    // Semester options (with tahun ajaran)
    const { data: semRaw } = await supabase
      .from("semester")
      .select("id, nama, tanggal_mulai, tanggal_selesai, is_active, tahun_ajaran_id")
      .order("tanggal_mulai", { ascending: false });
    const taIds = [...new Set((semRaw ?? []).map((s: any) => s.tahun_ajaran_id).filter(Boolean))];
    const { data: taRows } = taIds.length
      ? await supabase.from("tahun_ajaran").select("id, nama").in("id", taIds)
      : { data: [] as any[] };
    const taMap = new Map((taRows ?? []).map((t: any) => [t.id, t.nama as string]));
    const semesterOptions = (semRaw ?? []).map((s: any) => ({
      id: s.id,
      nama: s.nama,
      tanggal_mulai: s.tanggal_mulai,
      tanggal_selesai: s.tanggal_selesai,
      is_active: s.is_active,
      tahun_ajaran_id: s.tahun_ajaran_id,
      tahun_ajaran: s.tahun_ajaran_id ? taMap.get(s.tahun_ajaran_id) ?? null : null,
    }));

    const mode = data.mode ?? "bulan";
    const now = new Date();
    let periodeStart = "";
    let periodeEnd = "";
    let periodeLabel = "";
    let year = data.year ?? now.getFullYear();
    let month = data.month ?? now.getMonth() + 1;
    let semesterId = data.semesterId ?? null;

    if (mode === "semester") {
      let sem = semesterId ? (semesterOptions ?? []).find((s: any) => s.id === semesterId) : null;
      if (!sem) sem = (semesterOptions ?? []).find((s: any) => s.is_active) ?? (semesterOptions ?? [])[0] ?? null;
      if (sem) {
        semesterId = sem.id;
        periodeStart = sem.tanggal_mulai ?? `${year}-01-01`;
        periodeEnd = sem.tanggal_selesai ?? `${year}-12-31`;
        periodeLabel = sem.nama ?? "Semester";
      } else {
        periodeStart = `${year}-01-01`;
        periodeEnd = `${year}-12-31`;
        periodeLabel = `${year}`;
      }
    } else {
      periodeStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const monthEndDate = new Date(year, month, 0);
      periodeEnd = `${year}-${String(month).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;
      periodeLabel = new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }


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

    // Presensi pada periode (tidak dibatasi rombel saat ini agar riwayat lintas rombel ikut terhitung)
    let hadir = 0, sakit = 0, izin = 0, alfa = 0;
    const riwayat: { date: string; status: string }[] = [];
    {
      const { data: detsAll } = await supabase
        .from("attendance_details")
        .select("attendance_record_id, status")
        .eq("student_id", data.studentId);
      const recIds = [...new Set((detsAll ?? []).map((d: any) => d.attendance_record_id).filter(Boolean))];
      if (recIds.length) {
        const { data: recs } = await supabase
          .from("attendance_records")
          .select("id, date")
          .in("id", recIds)
          .gte("date", periodeStart)
          .lte("date", periodeEnd);
        const dateMap = new Map((recs ?? []).map((r: any) => [r.id, r.date as string]));
        (detsAll ?? []).forEach((d: any) => {
          const dt = dateMap.get(d.attendance_record_id);
          if (!dt) return;
          const s = String(d.status ?? "").toLowerCase();
          if (s === "h" || s === "hadir") hadir++;
          else if (s === "s" || s === "sakit") sakit++;
          else if (s === "i" || s === "izin") izin++;
          else if (s === "a" || s === "alfa") alfa++;
          riwayat.push({ date: dt, status: s });
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
        .in("status", ["A", "a", "alfa", "Alfa", "ALFA"]),
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

    // Riwayat kelas: gabungan kenaikan/tinggal/lulus/keluar + perpindahan rombel
    const [promoRes, trfRes] = await Promise.all([
      supabase
        .from("student_promotions")
        .select("id, status, tanggal_proses, created_at, rombel_asal_name, rombel_tujuan_name, catatan")
        .eq("student_id", data.studentId)
        .order("created_at", { ascending: false }),
      supabase
        .from("student_rombel_transfers")
        .select("id, tanggal_pindah, created_at, rombel_asal_name, rombel_tujuan_name, alasan")
        .eq("student_id", data.studentId)
        .order("created_at", { ascending: false }),
    ]);
    const riwayatKelas = [
      ...((promoRes.data ?? []) as any[]).map((r) => ({
        id: `p-${r.id}`,
        jenis: (r.status === "naik" ? "Kenaikan" : r.status === "tinggal" ? "Tinggal Kelas" : r.status === "lulus" ? "Lulus" : "Keluar") as string,
        status: r.status as string,
        tanggal: (r.tanggal_proses ?? r.created_at) as string,
        rombel_asal: r.rombel_asal_name ?? "—",
        rombel_tujuan: r.rombel_tujuan_name ?? "—",
        catatan: r.catatan ?? null,
      })),
      ...((trfRes.data ?? []) as any[]).map((r) => ({
        id: `t-${r.id}`,
        jenis: "Pindah Rombel",
        status: "pindah",
        tanggal: (r.tanggal_pindah ?? r.created_at) as string,
        rombel_asal: r.rombel_asal_name ?? "—",
        rombel_tujuan: r.rombel_tujuan_name ?? "—",
        catatan: r.alasan ?? null,
      })),
    ].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));

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
      periode: { mode, year, month, semesterId, periodeStart, periodeEnd, periodeLabel },
      semesterOptions: semesterOptions ?? [],
      presensi: { hadir, sakit, izin, alfa, persenHadir, riwayat },
      mapel: mapelRows,
      sp: {
        currentLevel: currentSp,
        alfaTotal,
        terlambatTotal,
        list: spList.slice(0, 10),
      },
      teman,
      riwayatKelas,
    };
  });
