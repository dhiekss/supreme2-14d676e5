import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listGuru = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("guru")
      .select("id, nama, nip")
      .order("nama");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listReferensi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("referensi_tpg")
      .select("id, guru_id, pangkat_golongan, gaji_pokok, besaran_pajak, besaran_bpjs, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = [...new Set((data ?? []).map((r: any) => r.guru_id).filter(Boolean))];
    const gMap = new Map<string, any>();
    if (ids.length) {
      const { data: g } = await context.supabase.from("guru").select("id, nama, nip").in("id", ids);
      (g ?? []).forEach((x: any) => gMap.set(x.id, x));
    }
    return (data ?? []).map((r: any) => ({
      ...r,
      guru_nama: gMap.get(r.guru_id)?.nama ?? "—",
      guru_nip: gMap.get(r.guru_id)?.nip ?? "—",
    }));
  });

export const upsertReferensi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      guru_id: z.string().uuid(),
      pangkat_golongan: z.string().optional().nullable(),
      gaji_pokok: z.number().int().min(0),
      besaran_pajak: z.number().int().min(0),
      besaran_bpjs: z.number().int().min(0),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      guru_id: data.guru_id,
      pangkat_golongan: data.pangkat_golongan ?? null,
      gaji_pokok: data.gaji_pokok,
      besaran_pajak: data.besaran_pajak,
      besaran_bpjs: data.besaran_bpjs,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await context.supabase.from("referensi_tpg").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("referensi_tpg").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteReferensi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("referensi_tpg").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLaporan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      bulan: z.number().int().optional(),
      tahun: z.number().int().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("laporan_tpg")
      .select("id, guru_id, referensi_tpg_id, bulan, tahun, nominal_diterima, bukti_transfer_url, created_at")
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false });
    if (data.bulan) q = q.eq("bulan", data.bulan);
    if (data.tahun) q = q.eq("tahun", data.tahun);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r: any) => r.guru_id).filter(Boolean))];
    const gMap = new Map<string, any>();
    if (ids.length) {
      const { data: g } = await context.supabase.from("guru").select("id, nama, nip").in("id", ids);
      (g ?? []).forEach((x: any) => gMap.set(x.id, x));
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      guru_nama: gMap.get(r.guru_id)?.nama ?? "—",
      guru_nip: gMap.get(r.guru_id)?.nip ?? "—",
    }));
  });

export const upsertLaporan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      guru_id: z.string().uuid(),
      referensi_tpg_id: z.string().uuid().optional().nullable(),
      bulan: z.number().int().min(1).max(12),
      tahun: z.number().int().min(2000).max(2100),
      nominal_diterima: z.number().int().min(0),
      bukti_transfer_url: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      guru_id: data.guru_id,
      referensi_tpg_id: data.referensi_tpg_id ?? null,
      bulan: data.bulan,
      tahun: data.tahun,
      nominal_diterima: data.nominal_diterima,
      bukti_transfer_url: data.bukti_transfer_url ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("laporan_tpg").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("laporan_tpg").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteLaporan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("laporan_tpg").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
