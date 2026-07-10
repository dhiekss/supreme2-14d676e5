import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listHariEfektif = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      jenis: z.string().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("hari_efektif")
      .select("id, tanggal, jenis, keterangan, created_at")
      .order("tanggal", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    if (data.jenis && data.jenis !== "all") q = q.eq("jenis", data.jenis);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertHariEfektif = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      tanggal: z.string(),
      jenis: z.enum(["efektif", "libur", "ujian", "kegiatan"]),
      keterangan: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      tanggal: data.tanggal,
      jenis: data.jenis,
      keterangan: data.keterangan ?? null,
    };
    if (data.id) {
      payload.updated_at = new Date().toISOString();
      const { error } = await context.supabase.from("hari_efektif").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("hari_efektif").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteHariEfektif = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("hari_efektif").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const summaryHariEfektif = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ from: z.string(), to: z.string() }).parse,
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("hari_efektif")
      .select("jenis")
      .gte("tanggal", data.from)
      .lte("tanggal", data.to);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = { efektif: 0, libur: 0, ujian: 0, kegiatan: 0 };
    for (const r of rows ?? []) {
      const j = (r as any).jenis as string;
      if (counts[j] !== undefined) counts[j]++;
    }
    return counts;
  });
