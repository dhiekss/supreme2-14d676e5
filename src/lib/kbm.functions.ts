import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listAgenda = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ limit: z.number().min(1).max(200).default(50) }).parse)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("kbm_agenda")
      .select("id, tanggal, jam_ke, materi_detail, guru_status, rombel_id, mata_pelajaran_id, guru_id")
      .order("tanggal", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const ids = {
      rombel: [...new Set(rows?.map((r) => r.rombel_id).filter(Boolean) as string[])],
      mapel: [...new Set(rows?.map((r) => r.mata_pelajaran_id).filter(Boolean) as string[])],
      guru: [...new Set(rows?.map((r) => r.guru_id).filter(Boolean) as string[])],
    };
    const [rombel, mapel, guru] = await Promise.all([
      ids.rombel.length ? context.supabase.from("rombel").select("id, name").in("id", ids.rombel) : Promise.resolve({ data: [] }),
      ids.mapel.length ? context.supabase.from("mata_pelajaran").select("id, nama").in("id", ids.mapel) : Promise.resolve({ data: [] }),
      ids.guru.length ? context.supabase.from("guru").select("id, nama").in("id", ids.guru) : Promise.resolve({ data: [] }),
    ]);
    const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));
    const mMap = new Map((mapel.data ?? []).map((x: any) => [x.id, x.nama]));
    const gMap = new Map((guru.data ?? []).map((x: any) => [x.id, x.nama]));

    return (rows ?? []).map((r) => ({
      ...r,
      rombel_name: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
      mapel_name: r.mata_pelajaran_id ? mMap.get(r.mata_pelajaran_id) ?? "—" : "—",
      guru_name: r.guru_id ? gMap.get(r.guru_id) ?? "—" : "—",
    }));
  });

export const listKbmOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [rombel, mapel, guru] = await Promise.all([
      context.supabase.from("rombel").select("id, name").order("name"),
      context.supabase.from("mata_pelajaran").select("id, nama").order("nama"),
      context.supabase.from("guru").select("id, nama").order("nama"),
    ]);
    return {
      rombel: rombel.data ?? [],
      mapel: mapel.data ?? [],
      guru: guru.data ?? [],
    };
  });

export const createAgenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      tanggal: z.string(),
      rombelId: z.string().uuid(),
      mataPelajaranId: z.string().uuid(),
      guruId: z.string().uuid(),
      jamKe: z.number().int().min(1).max(12),
      materiDetail: z.string().min(1).max(2000),
      guruStatus: z.enum(["Hadir", "Izin", "Sakit", "Dinas Luar"]).default("Hadir"),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { data: semester } = await context.supabase
      .from("semester")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    const { error } = await context.supabase.from("kbm_agenda").insert({
      tanggal: data.tanggal,
      rombel_id: data.rombelId,
      mata_pelajaran_id: data.mataPelajaranId,
      guru_id: data.guruId,
      jam_ke: data.jamKe,
      materi_detail: data.materiDetail,
      guru_status: data.guruStatus,
      created_by: context.userId,
      semester_id: semester?.id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
