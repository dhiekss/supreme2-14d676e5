import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const HARI_MAP = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "superadmin"])
    .maybeSingle();
  return !!data;
}

async function getSelfNip(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("nip").eq("id", userId).maybeSingle();
  return (data?.nip ?? null) as string | null;
}

async function assertGuruAccess(supabase: any, userId: string, guruId: string) {
  const admin = await isAdmin(supabase, userId);
  const { data: guru, error } = await supabase.from("guru").select("id, nama, nip").eq("id", guruId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!guru) throw new Error("Guru tidak ditemukan");
  if (!admin) {
    const nip = await getSelfNip(supabase, userId);
    if (!nip || nip !== guru.nip) throw new Error("Forbidden: hanya bisa mengakses agenda sendiri");
  }
  return { admin, guru };
}

export const listGuruForAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    let q = supabase.from("guru").select("id, nama, nip").order("nama");
    if (!admin) {
      const nip = await getSelfNip(supabase, userId);
      if (!nip) return { isAdmin: false, rows: [] };
      q = q.eq("nip", nip);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { isAdmin: admin, rows: data ?? [] };
  });

export const listJadwalAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      guruId: z.string().uuid(),
      tanggal: z.string(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertGuruAccess(supabase, userId, data.guruId);

    const dt = new Date(`${data.tanggal}T00:00:00`);
    const hariName = HARI_MAP[dt.getDay()];

    const { data: jadwal, error } = await supabase
      .from("jadwal_pelajaran")
      .select("id, hari, jam_ke, jam_mulai, jam_selesai, rombel_id, mata_pelajaran_id")
      .eq("guru_id", data.guruId)
      .eq("hari", hariName)
      .order("jam_ke");
    if (error) throw new Error(error.message);

    const rombelIds = [...new Set((jadwal ?? []).map((j: any) => j.rombel_id).filter(Boolean))] as string[];
    const mapelIds = [...new Set((jadwal ?? []).map((j: any) => j.mata_pelajaran_id).filter(Boolean))] as string[];
    const [rombel, mapel] = await Promise.all([
      rombelIds.length ? supabase.from("rombel").select("id, name").in("id", rombelIds) : Promise.resolve({ data: [] }),
      mapelIds.length ? supabase.from("mata_pelajaran").select("id, nama").in("id", mapelIds) : Promise.resolve({ data: [] }),
    ]);
    const rMap = new Map((rombel.data ?? []).map((r: any) => [r.id, r.name]));
    const mMap = new Map((mapel.data ?? []).map((m: any) => [m.id, m.nama]));

    const { data: agenda } = await supabase
      .from("kbm_agenda")
      .select("id, jam_ke, rombel_id, mata_pelajaran_id, materi_detail, guru_status")
      .eq("guru_id", data.guruId)
      .eq("tanggal", data.tanggal);
    const aMap = new Map<string, any>();
    (agenda ?? []).forEach((a: any) => {
      aMap.set(`${a.rombel_id}|${a.mata_pelajaran_id}|${a.jam_ke}`, a);
    });

    const slots = (jadwal ?? []).map((j: any) => ({
      jam_ke: Number(j.jam_ke ?? 0),
      jam_mulai: j.jam_mulai,
      jam_selesai: j.jam_selesai,
      rombel_id: j.rombel_id,
      rombel_name: j.rombel_id ? rMap.get(j.rombel_id) ?? "—" : "—",
      mata_pelajaran_id: j.mata_pelajaran_id,
      mapel_nama: j.mata_pelajaran_id ? mMap.get(j.mata_pelajaran_id) ?? "—" : "—",
    })).sort((a, b) => a.jam_ke - b.jam_ke);

    const groups: any[] = [];
    for (const s of slots) {
      const last = groups[groups.length - 1];
      if (
        last &&
        last.rombel_id === s.rombel_id &&
        last.mata_pelajaran_id === s.mata_pelajaran_id &&
        last.jam_ke_end + 1 === s.jam_ke
      ) {
        last.jam_ke_end = s.jam_ke;
        last.jam_selesai = s.jam_selesai ?? last.jam_selesai;
        last.jam_list.push(s.jam_ke);
      } else {
        groups.push({
          jam_ke_start: s.jam_ke,
          jam_ke_end: s.jam_ke,
          jam_list: [s.jam_ke],
          jam_mulai: s.jam_mulai,
          jam_selesai: s.jam_selesai,
          rombel_id: s.rombel_id,
          rombel_name: s.rombel_name,
          mata_pelajaran_id: s.mata_pelajaran_id,
          mapel_nama: s.mapel_nama,
        });
      }
    }

    return groups.map((g) => {
      const existing = g.jam_list
        .map((j: number) => aMap.get(`${g.rombel_id}|${g.mata_pelajaran_id}|${j}`))
        .filter(Boolean);
      return {
        ...g,
        sudah_diisi: existing.length > 0,
      };
    });
  });

export const getAgendaDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      guruId: z.string().uuid(),
      tanggal: z.string(),
      rombelId: z.string().uuid(),
      mataPelajaranId: z.string().uuid(),
      jamList: z.array(z.number().int()).min(1),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertGuruAccess(supabase, userId, data.guruId);

    const [{ data: students }, { data: agendaRows }] = await Promise.all([
      supabase.from("students").select("id, name, nis").eq("rombel_id", data.rombelId).order("name"),
      supabase.from("kbm_agenda")
        .select("id, jam_ke, guru_status, materi_detail, tp_manual, foto_dokumentasi, ttd_guru")
        .eq("guru_id", data.guruId).eq("tanggal", data.tanggal)
        .eq("rombel_id", data.rombelId).eq("mata_pelajaran_id", data.mataPelajaranId)
        .in("jam_ke", data.jamList),
    ]);

    const perJam: Record<number, any> = {};
    for (const j of data.jamList) perJam[j] = { guru_status: "masuk" };
    (agendaRows ?? []).forEach((r: any) => {
      perJam[Number(r.jam_ke)] = { id: r.id, guru_status: r.guru_status ?? "masuk" };
    });

    const first = (agendaRows ?? [])[0];
    let kehadiran: Record<string, string> = {};
    if (first?.id) {
      const agendaIds = (agendaRows ?? []).map((r: any) => r.id);
      const { data: keh } = await supabase
        .from("kbm_agenda_kehadiran")
        .select("student_id, status")
        .in("kbm_agenda_id", agendaIds);
      (keh ?? []).forEach((k: any) => {
        kehadiran[k.student_id] = k.status;
      });
    }

    return {
      students: students ?? [],
      perJam,
      tp_manual: first?.tp_manual ?? "",
      materi_detail: first?.materi_detail ?? "",
      foto_dokumentasi: first?.foto_dokumentasi ?? "",
      ttd_guru: first?.ttd_guru ?? "",
      kehadiran,
    };
  });


export const upsertAgendaGuru = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      guruId: z.string().uuid(),
      tanggal: z.string(),
      rombelId: z.string().uuid(),
      mataPelajaranId: z.string().uuid(),
      jamList: z.array(z.number().int().min(1).max(20)).min(1),
      perJamStatus: z.record(z.string(), z.enum(["masuk", "tidak_masuk_dengan_tugas", "tidak_masuk_tanpa_tugas"])),
      tpManual: z.string().max(2000).optional().default(""),
      materiDetail: z.string().max(4000).optional().default(""),
      fotoDokumentasi: z.string().optional().default(""),
      ttdGuru: z.string().optional().default(""),
      kehadiran: z.record(z.string(), z.enum(["hadir", "sakit", "izin", "alfa", "dispensasi", "bolos_kelas"])).optional().default({}),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertGuruAccess(supabase, userId, data.guruId);

    const { data: semester } = await supabase.from("semester").select("id").eq("is_active", true).maybeSingle();

    const agendaIds: string[] = [];
    for (const jam of data.jamList) {
      const status = data.perJamStatus[String(jam)] ?? "masuk";
      const { data: existing } = await supabase
        .from("kbm_agenda")
        .select("id")
        .eq("guru_id", data.guruId).eq("tanggal", data.tanggal)
        .eq("rombel_id", data.rombelId).eq("mata_pelajaran_id", data.mataPelajaranId)
        .eq("jam_ke", jam)
        .maybeSingle();

      const payload: any = {
        guru_id: data.guruId,
        tanggal: data.tanggal,
        rombel_id: data.rombelId,
        mata_pelajaran_id: data.mataPelajaranId,
        jam_ke: jam,
        materi_detail: data.materiDetail ?? "",
        guru_status: status,
        tp_manual: data.tpManual ?? "",
        foto_dokumentasi: data.fotoDokumentasi ?? "",
        ttd_guru: data.ttdGuru ?? "",
        semester_id: semester?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      let agendaId = existing?.id;
      if (agendaId) {
        const { error } = await supabase.from("kbm_agenda").update(payload).eq("id", agendaId);
        if (error) throw new Error(error.message);
      } else {
        payload.created_by = userId;
        const { data: ins, error } = await supabase.from("kbm_agenda").insert(payload).select("id").single();
        if (error) throw new Error(error.message);
        agendaId = ins.id;
      }
      agendaIds.push(agendaId);
    }

    // sync kehadiran on all agenda rows (mirror)
    if (agendaIds.length && Object.keys(data.kehadiran ?? {}).length) {
      await supabase.from("kbm_agenda_kehadiran").delete().in("kbm_agenda_id", agendaIds);
      const rows: any[] = [];
      for (const aid of agendaIds) {
        for (const [studentId, status] of Object.entries(data.kehadiran ?? {})) {
          rows.push({ kbm_agenda_id: aid, student_id: studentId, status });
        }
      }
      if (rows.length) {
        const { error } = await supabase.from("kbm_agenda_kehadiran").insert(rows);
        if (error) throw new Error(error.message);
      }
    }

    return { ok: true };
  });
