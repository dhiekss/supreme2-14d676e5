import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ===== Jenis Ruang =====
export const listJenis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sarpras_jenis_ruang")
      .select("id, nama, keterangan, is_kelas, created_at")
      .order("nama")
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertJenis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      nama: z.string().min(1).max(255),
      keterangan: z.string().max(500).optional(),
      isKelas: z.boolean().default(false),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      nama: data.nama,
      keterangan: data.keterangan ?? null,
      is_kelas: data.isKelas,
    };
    if (data.id) {
      const { error } = await context.supabase.from("sarpras_jenis_ruang").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("sarpras_jenis_ruang").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteJenis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sarpras_jenis_ruang").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Ruang =====
export const listRuang = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("sarpras_ruang")
      .select("id, nama, kode_ruang, kapasitas, jenis_ruang_id, rombel_id, created_at")
      .order("nama")
      .limit(500);
    if (error) throw new Error(error.message);

    const jids = [...new Set((rows ?? []).map((r) => r.jenis_ruang_id).filter(Boolean) as string[])];
    const rids = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean) as string[])];
    const [jenis, rombel] = await Promise.all([
      jids.length ? context.supabase.from("sarpras_jenis_ruang").select("id, nama").in("id", jids) : Promise.resolve({ data: [] }),
      rids.length ? context.supabase.from("rombel").select("id, name").in("id", rids) : Promise.resolve({ data: [] }),
    ]);
    const jMap = new Map((jenis.data ?? []).map((j: any) => [j.id, j.nama]));
    const rMap = new Map((rombel.data ?? []).map((r: any) => [r.id, r.name]));

    return (rows ?? []).map((r) => ({
      ...r,
      jenis_nama: r.jenis_ruang_id ? jMap.get(r.jenis_ruang_id) ?? "—" : "—",
      rombel_nama: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
    }));
  });

export const upsertRuang = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      nama: z.string().min(1).max(255),
      kodeRuang: z.string().max(50).optional(),
      kapasitas: z.number().int().min(0).optional(),
      jenisRuangId: z.string().uuid().optional(),
      rombelId: z.string().uuid().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      nama: data.nama,
      kode_ruang: data.kodeRuang ?? null,
      kapasitas: data.kapasitas ?? null,
      jenis_ruang_id: data.jenisRuangId ?? null,
      rombel_id: data.rombelId ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("sarpras_ruang").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("sarpras_ruang").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteRuang = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sarpras_ruang").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Pengajuan =====
export const listPengajuan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ status: z.string().default("all") }).parse)
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("sarpras_pengajuan")
      .select("id, jenis, nama, quantity, satuan, perkiraan_harga, total_harga, link_referensi, keperluan, status, catatan_penolakan, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPengajuan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      jenis: z.string().min(1).max(100),
      nama: z.string().min(1).max(255),
      quantity: z.number().int().min(1),
      satuan: z.string().max(50).optional(),
      perkiraanHarga: z.number().int().min(0).optional(),
      linkReferensi: z.string().url().optional().or(z.literal("")),
      keperluan: z.string().min(3).max(1000),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const total = (data.perkiraanHarga ?? 0) * data.quantity;
    const { error } = await context.supabase.from("sarpras_pengajuan").insert({
      jenis: data.jenis,
      nama: data.nama,
      quantity: data.quantity,
      satuan: data.satuan ?? null,
      perkiraan_harga: data.perkiraanHarga ?? null,
      total_harga: total,
      link_referensi: data.linkReferensi || null,
      keperluan: data.keperluan,
      status: "pending",
      pengaju_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decidePengajuan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["disetujui", "ditolak"]),
      catatan: z.string().max(1000).optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sarpras_pengajuan").update({
      status: data.decision,
      catatan_penolakan: data.decision === "ditolak" ? (data.catatan ?? null) : null,
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePengajuan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sarpras_pengajuan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Helpers for selectors
export const sarprasOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [j, r] = await Promise.all([
      context.supabase.from("sarpras_jenis_ruang").select("id, nama").order("nama"),
      context.supabase.from("rombel").select("id, name").order("name"),
    ]);
    return { jenis: j.data ?? [], rombel: r.data ?? [] };
  });
