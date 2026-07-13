import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* =========================================================
 * Hari Efektif — Hari Libur & Hari Non-KBM
 * =======================================================*/

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
      .order("tanggal", { ascending: true })
      .limit(1000);
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
      jenis: z.enum(["libur", "non_kbm"]),
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
    const counts: Record<string, number> = { libur: 0, non_kbm: 0 };
    for (const r of rows ?? []) {
      const j = (r as any).jenis as string;
      if (counts[j] !== undefined) counts[j]++;
    }
    return counts;
  });

/* =========================================================
 * Pengecualian Input
 * =======================================================*/

export const listPengecualianInput = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("pengecualian_input")
      .select("id, lingkup, target_rombel_id, target_tingkat, target_konsentrasi_id, modul, tanggal_mulai, tanggal_selesai, keterangan, aktif")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const rombelIds = Array.from(new Set((rows ?? []).map((r: any) => r.target_rombel_id).filter(Boolean)));
    const konsIds = Array.from(new Set((rows ?? []).map((r: any) => r.target_konsentrasi_id).filter(Boolean)));

    let rombelMap: Record<string, string> = {};
    let konsMap: Record<string, string> = {};
    if (rombelIds.length) {
      const { data: rs } = await context.supabase.from("rombel").select("id, name").in("id", rombelIds);
      for (const r of rs ?? []) rombelMap[String((r as any).id)] = String((r as any).name);
    }
    if (konsIds.length) {
      const { data: ks } = await context.supabase.from("konsentrasi_keahlian").select("id, nama").in("id", konsIds);
      for (const k of ks ?? []) konsMap[String((k as any).id)] = String((k as any).nama);
    }

    return (rows ?? []).map((r: any) => ({
      ...r,
      target_label:
        r.lingkup === "rombel" ? rombelMap[r.target_rombel_id] ?? "-" :
        r.lingkup === "tingkat" ? r.target_tingkat ?? "-" :
        konsMap[r.target_konsentrasi_id] ?? "-",
    }));
  });

export const upsertPengecualianInput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      lingkup: z.enum(["rombel", "tingkat", "konsentrasi_keahlian"]),
      target_rombel_id: z.string().uuid().nullable().optional(),
      target_tingkat: z.string().nullable().optional(),
      target_konsentrasi_id: z.string().uuid().nullable().optional(),
      modul: z.enum(["presensi", "kbm", "audit"]),
      tanggal_mulai: z.string(),
      tanggal_selesai: z.string(),
      keterangan: z.string().nullable().optional(),
      aktif: z.boolean().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      lingkup: data.lingkup,
      target_rombel_id: data.lingkup === "rombel" ? data.target_rombel_id ?? null : null,
      target_tingkat: data.lingkup === "tingkat" ? data.target_tingkat ?? null : null,
      target_konsentrasi_id: data.lingkup === "konsentrasi_keahlian" ? data.target_konsentrasi_id ?? null : null,
      modul: data.modul,
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai,
      keterangan: data.keterangan ?? null,
      aktif: data.aktif ?? true,
    };
    if (data.id) {
      payload.updated_at = new Date().toISOString();
      const { error } = await context.supabase.from("pengecualian_input").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("pengecualian_input").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePengecualianInput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("pengecualian_input").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRombelForPengecualian = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rombel")
      .select("id, name, tingkat")
      .order("tingkat", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listKonsentrasiForPengecualian = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("konsentrasi_keahlian")
      .select("id, nama")
      .order("nama");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
