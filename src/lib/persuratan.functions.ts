import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ===== Kode Surat =====
export const listKode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("persuratan_kode_surat")
      .select("id, kode, nama, keterangan, urutan, is_active, created_at")
      .order("urutan", { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertKode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      kode: z.string().min(1).max(50),
      nama: z.string().min(1).max(255),
      keterangan: z.string().max(500).optional(),
      urutan: z.number().int().optional(),
      isActive: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      kode: data.kode,
      nama: data.nama,
      keterangan: data.keterangan ?? null,
      urutan: data.urutan ?? null,
      is_active: data.isActive,
    };
    if (data.id) {
      const { error } = await context.supabase.from("persuratan_kode_surat").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("persuratan_kode_surat").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteKode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("persuratan_kode_surat").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Nomor Surat =====
export const listNomor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("persuratan_nomor_surat")
      .select("id, jenis_surat, prefix, format_nomor, counter, tahun, contoh_hasil, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertNomor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      jenisSurat: z.string().min(1).max(100),
      prefix: z.string().max(50).optional(),
      formatNomor: z.string().min(1).max(255),
      counter: z.number().int().min(0).default(0),
      tahun: z.number().int().min(2000).max(2100),
      contohHasil: z.string().max(255).optional(),
      isActive: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      jenis_surat: data.jenisSurat,
      prefix: data.prefix ?? null,
      format_nomor: data.formatNomor,
      counter: data.counter,
      tahun: data.tahun,
      contoh_hasil: data.contohHasil ?? null,
      is_active: data.isActive,
    };
    if (data.id) {
      const { error } = await context.supabase.from("persuratan_nomor_surat").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("persuratan_nomor_surat").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const incrementNomor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { data: row, error: e1 } = await context.supabase
      .from("persuratan_nomor_surat")
      .select("counter, format_nomor, prefix, tahun")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const next = (row?.counter ?? 0) + 1;
    const padded = String(next).padStart(3, "0");
    const generated = (row?.format_nomor ?? "")
      .replace("{counter}", padded)
      .replace("{prefix}", row?.prefix ?? "")
      .replace("{tahun}", String(row?.tahun ?? ""));
    const { error: e2 } = await context.supabase
      .from("persuratan_nomor_surat")
      .update({ counter: next, contoh_hasil: generated })
      .eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true, nomor: generated, counter: next };
  });

export const deleteNomor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("persuratan_nomor_surat").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Kop Surat =====
export const listKop = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("persuratan_kop_surat")
      .select("id, nama, file_url, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertKop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      nama: z.string().min(1).max(255),
      fileUrl: z.string().url().optional().or(z.literal("")),
      isActive: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      nama: data.nama,
      file_url: data.fileUrl || null,
      is_active: data.isActive,
    };
    if (data.id) {
      const { error } = await context.supabase.from("persuratan_kop_surat").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("persuratan_kop_surat").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteKop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("persuratan_kop_surat").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Pengaturan Umum =====
export const listPengaturanUmum = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("persuratan_pengaturan_umum")
      .select("id, key, value, deskripsi, updated_at")
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const savePengaturanUmum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      items: z.array(
        z.object({
          key: z.string().min(1).max(100),
          value: z.string().max(2000).nullable().optional(),
          deskripsi: z.string().max(255).optional(),
        }),
      ),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    for (const it of data.items) {
      const { data: existing } = await context.supabase
        .from("persuratan_pengaturan_umum")
        .select("id")
        .eq("key", it.key)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await context.supabase
          .from("persuratan_pengaturan_umum")
          .update({ value: it.value ?? null, deskripsi: it.deskripsi ?? null, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await context.supabase
          .from("persuratan_pengaturan_umum")
          .insert({ key: it.key, value: it.value ?? null, deskripsi: it.deskripsi ?? null });
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true };
  });

// ===== Auto-Reserve Nomor Surat (Run Now) =====
export const runAutoReserveNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: e0 } = await context.supabase
      .rpc("is_admin", { _user_id: context.userId });
    if (e0) throw new Error(e0.message);
    if (!isAdmin) throw new Error("Hanya admin yang bisa menjalankan pengamanan nomor");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("auto_reserve_nomor_surat");
    if (error) throw new Error(error.message);
    return { ok: true, result: data };
  });

