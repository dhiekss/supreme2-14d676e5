import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const izinOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [guru] = await Promise.all([
      context.supabase.from("guru").select("id, nama").order("nama"),
    ]);
    return { guru: guru.data ?? [] };
  });

export const listIzin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ status: z.string().default("all"), from: z.string().optional(), to: z.string().optional() }).parse)
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("guru_izin")
      .select("id, guru_id, tanggal_mulai, tanggal_selesai, jenis_izin, alasan, status, catatan_admin, approved_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.from) q = q.gte("tanggal_mulai", data.from);
    if (data.to) q = q.lte("tanggal_selesai", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = [...new Set((rows ?? []).map((r) => r.guru_id).filter(Boolean) as string[])];
    const { data: guru } = ids.length
      ? await context.supabase.from("guru").select("id, nama").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((guru ?? []).map((g: any) => [g.id, g.nama]));
    return (rows ?? []).map((r) => ({ ...r, guru_nama: r.guru_id ? map.get(r.guru_id) ?? "—" : "—" }));
  });

export const createIzin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      guruId: z.string().uuid(),
      tanggalMulai: z.string(),
      tanggalSelesai: z.string(),
      jenisIzin: z.enum(["sakit", "izin", "dinas", "cuti"]),
      alasan: z.string().min(3).max(500),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("guru_izin").insert({
      guru_id: data.guruId,
      user_id: context.userId,
      tanggal_mulai: data.tanggalMulai,
      tanggal_selesai: data.tanggalSelesai,
      jenis_izin: data.jenisIzin,
      alasan: data.alasan,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideIzin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), decision: z.enum(["disetujui", "ditolak"]), catatan: z.string().max(500).optional() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("guru_izin").update({
      status: data.decision,
      approved_by: context.userId,
      approved_at: new Date().toISOString(),
      catatan_admin: data.catatan ?? null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteIzin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("guru_izin").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
