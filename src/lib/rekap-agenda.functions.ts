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
    const { supabase } = context;

    let q = supabase
      .from("kbm_agenda")
      .select("id, tanggal, jam_ke, guru_id, rombel_id, mata_pelajaran_id, guru_status, materi_detail, tp_manual")
      .gte("tanggal", data.from)
      .lte("tanggal", data.to)
      .order("tanggal", { ascending: false });
    if (data.guruId) q = q.eq("guru_id", data.guruId);
    if (data.rombelId) q = q.eq("rombel_id", data.rombelId);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const guruIds = [...new Set((rows ?? []).map((r) => r.guru_id).filter(Boolean))] as string[];
    const rombelIds = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean))] as string[];
    const mapelIds = [...new Set((rows ?? []).map((r) => r.mata_pelajaran_id).filter(Boolean))] as string[];

    const [guru, rombel, mapel] = await Promise.all([
      guruIds.length ? supabase.from("guru").select("id, nama, nip").in("id", guruIds) : Promise.resolve({ data: [] as any[] }),
      rombelIds.length ? supabase.from("rombel").select("id, name").in("id", rombelIds) : Promise.resolve({ data: [] as any[] }),
      mapelIds.length ? supabase.from("mata_pelajaran").select("id, nama").in("id", mapelIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const gMap = new Map((guru.data ?? []).map((x: any) => [x.id, x]));
    const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));
    const mMap = new Map((mapel.data ?? []).map((x: any) => [x.id, x.nama]));

    const enriched = (rows ?? []).map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      jam_ke: r.jam_ke,
      guru_id: r.guru_id,
      guru_nama: r.guru_id ? gMap.get(r.guru_id)?.nama ?? "—" : "—",
      guru_nip: r.guru_id ? gMap.get(r.guru_id)?.nip ?? "" : "",
      rombel_name: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
      mapel_nama: r.mata_pelajaran_id ? mMap.get(r.mata_pelajaran_id) ?? "—" : "—",
      guru_status: r.guru_status ?? "masuk",
      materi_detail: r.materi_detail ?? "",
      tp_manual: r.tp_manual ?? "",
    }));

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
    };
  });

export const listRekapOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [guru, rombel] = await Promise.all([
      context.supabase.from("guru").select("id, nama").order("nama"),
      context.supabase.from("rombel").select("id, name").order("name"),
    ]);
    return { guru: guru.data ?? [], rombel: rombel.data ?? [] };
  });
