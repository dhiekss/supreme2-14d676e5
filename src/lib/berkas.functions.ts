import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const berkasOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [rmp, rombel, mapel, guru] = await Promise.all([
      supabase.from("rombel_mata_pelajaran").select("id, rombel_id, mata_pelajaran_id, guru_id").is("deleted_at", null),
      supabase.from("rombel").select("id, name"),
      supabase.from("mata_pelajaran").select("id, nama, kode"),
      supabase.from("guru").select("id, nama"),
    ]);
    return {
      rmp: rmp.data ?? [],
      rombel: rombel.data ?? [],
      mapel: mapel.data ?? [],
      guru: guru.data ?? [],
    };
  });

export const listBerkas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ guruId: z.string().uuid().optional(), status: z.string().optional() }).parse)
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("berkas_pembelajaran")
      .select("id, rombel_mata_pelajaran_id, guru_id, prota_link, promes_link, prota_promes_link, atp_link, modul_ajar_link, status, catatan_perbaikan, diperiksa_oleh_nama, diperiksa_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.guruId) q = q.eq("guru_id", data.guruId);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const rmpIds = [...new Set((rows ?? []).map((r) => r.rombel_mata_pelajaran_id).filter(Boolean) as string[])];
    const gIds = [...new Set((rows ?? []).map((r) => r.guru_id).filter(Boolean) as string[])];
    const [rmp, guru] = await Promise.all([
      rmpIds.length ? context.supabase.from("rombel_mata_pelajaran").select("id, rombel_id, mata_pelajaran_id").in("id", rmpIds) : Promise.resolve({ data: [] }),
      gIds.length ? context.supabase.from("guru").select("id, nama").in("id", gIds) : Promise.resolve({ data: [] }),
    ]);
    const rmpMap = new Map((rmp.data ?? []).map((x: any) => [x.id, x]));
    const rIds = [...new Set([...(rmp.data ?? [])].map((x: any) => x.rombel_id).filter(Boolean))];
    const mIds = [...new Set([...(rmp.data ?? [])].map((x: any) => x.mata_pelajaran_id).filter(Boolean))];
    const [rombel, mapel] = await Promise.all([
      rIds.length ? context.supabase.from("rombel").select("id, name").in("id", rIds) : Promise.resolve({ data: [] }),
      mIds.length ? context.supabase.from("mata_pelajaran").select("id, nama").in("id", mIds) : Promise.resolve({ data: [] }),
    ]);
    const rombelMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));
    const mapelMap = new Map((mapel.data ?? []).map((x: any) => [x.id, x.nama]));
    const guruMap = new Map((guru.data ?? []).map((x: any) => [x.id, x.nama]));

    return (rows ?? []).map((r) => {
      const rm = r.rombel_mata_pelajaran_id ? rmpMap.get(r.rombel_mata_pelajaran_id) as any : null;
      return {
        ...r,
        guru_nama: r.guru_id ? guruMap.get(r.guru_id) ?? "—" : "—",
        rombel_name: rm ? rombelMap.get(rm.rombel_id) ?? "—" : "—",
        mapel_nama: rm ? mapelMap.get(rm.mata_pelajaran_id) ?? "—" : "—",
      };
    });
  });

export const upsertBerkas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      rombelMataPelajaranId: z.string().uuid(),
      guruId: z.string().uuid(),
      protaLink: z.string().url().optional().or(z.literal("")),
      promesLink: z.string().url().optional().or(z.literal("")),
      atpLink: z.string().url().optional().or(z.literal("")),
      modulAjarLink: z.string().url().optional().or(z.literal("")),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload = {
      rombel_mata_pelajaran_id: data.rombelMataPelajaranId,
      guru_id: data.guruId,
      prota_link: data.protaLink || null,
      promes_link: data.promesLink || null,
      atp_link: data.atpLink || null,
      modul_ajar_link: data.modulAjarLink || null,
      status: "menunggu",
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("berkas_pembelajaran").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("berkas_pembelajaran").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const reviewBerkas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["disetujui", "perbaikan"]),
      catatan: z.string().max(1000).optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const { error } = await context.supabase.from("berkas_pembelajaran").update({
      status: data.status,
      catatan_perbaikan: data.status === "perbaikan" ? (data.catatan ?? null) : null,
      diperiksa_oleh: context.userId,
      diperiksa_oleh_nama: (profile as any)?.full_name ?? null,
      diperiksa_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBerkas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("berkas_pembelajaran").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
