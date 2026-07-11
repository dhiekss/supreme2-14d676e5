import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============ Surat Keluar ============
export const listSuratKeluar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("surat_keluar")
      .select(
        "id, kode_surat, nomor_urut, nomor_surat, tanggal_surat, tujuan, perihal, jenis_surat, sifat_surat, isi_ringkas, file_url, status, created_at",
      )
      .order("tanggal_surat", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(0, 4999);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const SuratInput = z.object({
  id: z.string().uuid().optional(),
  kode_surat: z.string().trim().min(1).max(50),
  nomor_urut: z.number().int().min(1).max(999999),
  nomor_surat: z.string().trim().min(1).max(255),
  tanggal_surat: z.string().min(1),
  tujuan: z.string().trim().min(1).max(255),
  perihal: z.string().trim().min(1).max(500),
  jenis_surat: z.string().trim().min(1).max(100),
  sifat_surat: z.string().trim().min(1).max(50),
  isi_ringkas: z.string().max(2000).optional().nullable(),
  file_url: z.string().max(1000).optional().nullable(),
  status: z.string().max(30).optional().nullable(),
  reserved_id: z.string().uuid().optional().nullable(),
});

export const saveSuratKeluar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(SuratInput.parse)
  .handler(async ({ context, data }) => {
    const payload: any = {
      kode_surat: data.kode_surat,
      nomor_urut: data.nomor_urut,
      nomor_surat: data.nomor_surat,
      tanggal_surat: data.tanggal_surat,
      tujuan: data.tujuan,
      perihal: data.perihal,
      jenis_surat: data.jenis_surat,
      sifat_surat: data.sifat_surat,
      isi_ringkas: data.isi_ringkas ?? null,
      file_url: data.file_url ?? null,
      status: data.status ?? "draft",
    };
    let suratId = data.id;
    if (data.id) {
      const { error } = await context.supabase.from("surat_keluar").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.pembuat_id = context.userId;
      const { data: ins, error } = await context.supabase.from("surat_keluar").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      suratId = ins?.id;
    }
    if (data.reserved_id && suratId) {
      await context.supabase
        .from("persuratan_nomor_diamankan")
        .update({ status: "digunakan", used_by_surat_id: suratId })
        .eq("id", data.reserved_id);
    }
    return { ok: true, id: suratId };
  });

export const deleteSuratKeluar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("surat_keluar").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Nomor Diamankan ============
export const listNomorDiamankan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("persuratan_nomor_diamankan")
      .select("id, kode_surat, nomor_urut, tanggal_diamankan, status, used_by_surat_id, created_at")
      .order("nomor_urut", { ascending: true })
      .range(0, 4999);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const AmankanInput = z.object({
  kode_surat: z.string().trim().min(1).max(50),
  nomor_urut: z.number().int().min(1).max(999999),
});

export const amankanNomor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(AmankanInput.parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("persuratan_nomor_diamankan").insert({
      kode_surat: data.kode_surat,
      nomor_urut: data.nomor_urut,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNomorDiamankan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("persuratan_nomor_diamankan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Suggest next nomor_urut for a given kode_surat
export const nextNomorUrut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ kode_surat: z.string().min(1).max(50) }).parse)
  .handler(async ({ context, data }) => {
    const [{ data: sk }, { data: nd }] = await Promise.all([
      context.supabase.from("surat_keluar").select("nomor_urut").eq("kode_surat", data.kode_surat).order("nomor_urut", { ascending: false, nullsFirst: false }).limit(1),
      context.supabase.from("persuratan_nomor_diamankan").select("nomor_urut").eq("kode_surat", data.kode_surat).order("nomor_urut", { ascending: false }).limit(1),
    ]);
    const a = sk?.[0]?.nomor_urut ?? 0;
    const b = nd?.[0]?.nomor_urut ?? 0;
    return { next: Math.max(a, b) + 1 };
  });
