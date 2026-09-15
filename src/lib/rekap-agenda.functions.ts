import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getRekapAgendaGuru = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      from: z.string(),
      to: z.string(),
      guruId: z.string().uuid().optional(),
      rombelId: z.string().uuid().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Role-based scope: non-admin/superadmin dibatasi hanya ke data guru miliknya sendiri
    // (matched via profiles.nip -> guru.nip).
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("nip, full_name").eq("id", userId).maybeSingle(),
    ]);
    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    const isPrivileged = roles.has("admin") || roles.has("superadmin");

    let restrictedGuruId: string | null = null;
    if (!isPrivileged) {
      const nip = profile?.nip ?? null;
      if (nip) {
        const { data: g } = await supabase.from("guru").select("id").eq("nip", nip).maybeSingle();
        restrictedGuruId = g?.id ?? null;
      }
      // Jika tidak ada guru yang cocok, kembalikan hasil kosong (bukan error) agar UI tetap render.
      if (!restrictedGuruId) {
        return {
          kpi: { total: 0, masuk: 0, tidakTugas: 0, tidakTanpa: 0, withTp: 0, guruAktif: 0, rombelAktif: 0, kehadiranPct: 0 },
          perGuru: [],
          rows: [],
          sessions: [],
          scope: { isPrivileged, restrictedGuruId: null as string | null },
        };
      }
    }

    let q = supabase
      .from("kbm_agenda")
      .select("id, tanggal, jam_ke, guru_id, rombel_id, mata_pelajaran_id, guru_status, materi_detail, tp_manual")
      .gte("tanggal", data.from)
      .lte("tanggal", data.to)
      .order("tanggal", { ascending: false })
      .order("jam_ke", { ascending: true });
    if (restrictedGuruId) q = q.eq("guru_id", restrictedGuruId);
    else if (data.guruId) q = q.eq("guru_id", data.guruId);
    if (data.rombelId) q = q.eq("rombel_id", data.rombelId);


    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const guruIds = [...new Set((rows ?? []).map((r) => r.guru_id).filter(Boolean))] as string[];
    const rombelIds = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean))] as string[];
    const mapelIds = [...new Set((rows ?? []).map((r) => r.mata_pelajaran_id).filter(Boolean))] as string[];
    const agendaIds = (rows ?? []).map((r) => r.id);

    const fetchKehadiran = async () => {
      if (!agendaIds.length) return [] as any[];
      const CHUNK = 300;
      const chunks: string[][] = [];
      for (let i = 0; i < agendaIds.length; i += CHUNK) chunks.push(agendaIds.slice(i, i + CHUNK));
      const results = await Promise.all(
        chunks.map(async (slice) => {
          const acc: any[] = [];
          const PAGE = 1000;
          let from = 0;
          while (true) {
            const { data, error } = await supabase
              .from("kbm_agenda_kehadiran")
              .select("kbm_agenda_id, student_id, status")
              .in("kbm_agenda_id", slice)
              .range(from, from + PAGE - 1);
            if (error) throw new Error(error.message);
            const batch = data ?? [];
            acc.push(...batch);
            if (batch.length < PAGE) break;
            from += PAGE;
          }
          return acc;
        }),
      );
      return results.flat();
    };

    const [guru, rombel, mapel, kehRows] = await Promise.all([
      guruIds.length ? supabase.from("guru").select("id, nama, nip").in("id", guruIds) : Promise.resolve({ data: [] as any[] }),
      rombelIds.length ? supabase.from("rombel").select("id, name").in("id", rombelIds) : Promise.resolve({ data: [] as any[] }),
      mapelIds.length ? supabase.from("mata_pelajaran").select("id, nama").in("id", mapelIds) : Promise.resolve({ data: [] as any[] }),
      fetchKehadiran(),
    ]);
    const keh = { data: kehRows } as { data: any[] };

    const gMap = new Map((guru.data ?? []).map((x: any) => [x.id, x]));
    const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));
    const mMap = new Map((mapel.data ?? []).map((x: any) => [x.id, x.nama]));

    // Kehadiran per agenda_id
    const kehPerAgenda = new Map<string, { hadir: number; sakit: number; izin: number; alfa: number; dispensasi: number; bolos: number; total: number }>();
    for (const k of (keh.data ?? []) as any[]) {
      const cur = kehPerAgenda.get(k.kbm_agenda_id) ?? { hadir: 0, sakit: 0, izin: 0, alfa: 0, dispensasi: 0, bolos: 0, total: 0 };
      cur.total += 1;
      if (k.status === "hadir") cur.hadir += 1;
      else if (k.status === "sakit") cur.sakit += 1;
      else if (k.status === "izin") cur.izin += 1;
      else if (k.status === "alfa") cur.alfa += 1;
      else if (k.status === "dispensasi") cur.dispensasi += 1;
      else if (k.status === "bolos_kelas") cur.bolos += 1;
      kehPerAgenda.set(k.kbm_agenda_id, cur);
    }

    const enriched = (rows ?? []).map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      jam_ke: r.jam_ke,
      guru_id: r.guru_id,
      guru_nama: r.guru_id ? gMap.get(r.guru_id)?.nama ?? "—" : "—",
      guru_nip: r.guru_id ? gMap.get(r.guru_id)?.nip ?? "" : "",
      rombel_id: r.rombel_id,
      rombel_name: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
      mapel_id: r.mata_pelajaran_id,
      mapel_nama: r.mata_pelajaran_id ? mMap.get(r.mata_pelajaran_id) ?? "—" : "—",
      guru_status: r.guru_status ?? "masuk",
      materi_detail: r.materi_detail ?? "",
      tp_manual: r.tp_manual ?? "",
    }));

    // Group into sessions: same tanggal|guru|rombel|mapel|status
    const sessionMap = new Map<string, any>();
    for (const r of enriched) {
      const key = `${r.tanggal}|${r.guru_id ?? ""}|${r.rombel_id ?? ""}|${r.mapel_id ?? ""}|${r.guru_status}`;
      const cur = sessionMap.get(key);
      if (!cur) {
        const kh = kehPerAgenda.get(r.id) ?? { hadir: 0, sakit: 0, izin: 0, alfa: 0, dispensasi: 0, bolos: 0, total: 0 };
        sessionMap.set(key, {
          key,
          tanggal: r.tanggal,
          guru_id: r.guru_id,
          guru_nama: r.guru_nama,
          guru_nip: r.guru_nip,
          rombel_id: r.rombel_id,
          rombel_name: r.rombel_name,
          mapel_id: r.mapel_id,
          mapel_nama: r.mapel_nama,
          guru_status: r.guru_status,
          jam_list: [r.jam_ke],
          agenda_ids: [r.id],
          materi_detail: r.materi_detail,
          tp_manual: r.tp_manual,
          hadir: kh.hadir,
          sakit: kh.sakit,
          izin: kh.izin,
          alfa: kh.alfa,
          dispensasi: kh.dispensasi,
          bolos: kh.bolos,
          jml: kh.total,
        });
      } else {
        cur.jam_list.push(r.jam_ke);
        cur.agenda_ids.push(r.id);
      }
    }
    const sessions = [...sessionMap.values()].map((s) => {
      s.jam_list.sort((a: number, b: number) => a - b);
      const min = s.jam_list[0];
      const max = s.jam_list[s.jam_list.length - 1];
      const contiguous = s.jam_list.every((j: number, i: number) => i === 0 || j === s.jam_list[i - 1] + 1);
      s.jam_label = s.jam_list.length === 1 ? String(min) : contiguous ? `${min}-${max}` : s.jam_list.join(",");

      // Aggregate kehadiran across all agenda_ids in the session.
      // Kehadiran biasanya hanya diisi di salah satu jam; ambil baris dengan total terbanyak
      // agar Jml/H/S/I/D/B/A mencerminkan isian sebenarnya (tidak menjumlahkan duplikat per jam).
      let best = { hadir: 0, sakit: 0, izin: 0, alfa: 0, dispensasi: 0, bolos: 0, total: 0 };
      for (const aid of s.agenda_ids as string[]) {
        const kh = kehPerAgenda.get(aid);
        if (kh && kh.total > best.total) best = kh;
      }
      s.hadir = best.hadir;
      s.sakit = best.sakit;
      s.izin = best.izin;
      s.alfa = best.alfa;
      s.dispensasi = best.dispensasi;
      s.bolos = best.bolos;
      s.jml = best.total;
      return s;
    });


    const total = enriched.length;
    const masuk = enriched.filter((x) => x.guru_status === "masuk").length;
    const tidakTugas = enriched.filter((x) => x.guru_status === "tidak_masuk_dengan_tugas").length;
    const tidakTanpa = enriched.filter((x) => x.guru_status === "tidak_masuk_tanpa_tugas").length;
    const withTp = enriched.filter((x) => (x.tp_manual ?? "").trim().length > 0).length;
    const guruAktif = new Set(enriched.map((x) => x.guru_id)).size;
    const rombelAktif = new Set(enriched.map((x) => x.rombel_name).filter((x) => x !== "—")).size;

    // Per guru summary
    const perGuruMap = new Map<string, any>();
    for (const r of enriched) {
      const key = r.guru_id ?? "unknown";
      const cur = perGuruMap.get(key) ?? {
        guru_id: r.guru_id,
        guru_nama: r.guru_nama,
        guru_nip: r.guru_nip,
        total: 0,
        masuk: 0,
        tidak_tugas: 0,
        tidak_tanpa: 0,
        with_tp: 0,
      };
      cur.total += 1;
      if (r.guru_status === "masuk") cur.masuk += 1;
      else if (r.guru_status === "tidak_masuk_dengan_tugas") cur.tidak_tugas += 1;
      else if (r.guru_status === "tidak_masuk_tanpa_tugas") cur.tidak_tanpa += 1;
      if ((r.tp_manual ?? "").trim().length > 0) cur.with_tp += 1;
      perGuruMap.set(key, cur);
    }
    const perGuru = [...perGuruMap.values()].sort((a, b) => b.total - a.total);

    return {
      kpi: {
        total,
        masuk,
        tidakTugas,
        tidakTanpa,
        withTp,
        guruAktif,
        rombelAktif,
        kehadiranPct: total ? Math.round((masuk / total) * 1000) / 10 : 0,
      },
      perGuru,
      rows: enriched,
      sessions,
      scope: { isPrivileged, restrictedGuruId },
    };
  });


export const listRekapOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: roleRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("nip").eq("id", userId).maybeSingle(),
    ]);
    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    const isPrivileged = roles.has("admin") || roles.has("superadmin");

    if (!isPrivileged) {
      const nip = profile?.nip ?? null;
      let guruList: any[] = [];
      if (nip) {
        const { data: g } = await supabase.from("guru").select("id, nama").eq("nip", nip);
        guruList = g ?? [];
      }
      const rombel = await supabase.from("rombel").select("id, name").order("name");
      return { guru: guruList, rombel: rombel.data ?? [], isPrivileged };
    }

    const [guru, rombel] = await Promise.all([
      supabase.from("guru").select("id, nama").order("nama"),
      supabase.from("rombel").select("id, name").order("name"),
    ]);
    return { guru: guru.data ?? [], rombel: rombel.data ?? [], isPrivileged };
  });


export const bulkDeleteAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ agendaIds: z.array(z.string().uuid()).min(1) }).parse)
  .handler(async ({ context, data }) => {
    // Remove child kehadiran first, then agenda rows
    await context.supabase.from("kbm_agenda_kehadiran").delete().in("kbm_agenda_id", data.agendaIds);
    const { error } = await context.supabase.from("kbm_agenda").delete().in("id", data.agendaIds);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.agendaIds.length };
  });

export const bulkUpdateAgendaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      agendaIds: z.array(z.string().uuid()).min(1),
      guru_status: z.enum(["masuk", "tidak_masuk_dengan_tugas", "tidak_masuk_tanpa_tugas"]),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("kbm_agenda")
      .update({ guru_status: data.guru_status })
      .in("id", data.agendaIds);
    if (error) throw new Error(error.message);
    return { ok: true, updated: data.agendaIds.length };
  });
