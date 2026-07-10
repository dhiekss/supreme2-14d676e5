import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listSp = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      level: z.coerce.number().int().min(1).max(3).optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("sp_records")
      .select("id, student_id, sp_level, alasan, jumlah_alfa, jumlah_terlambat, dokumen_pendukung, tanggal_rekaman, created_at")
      .order("tanggal_rekaman", { ascending: false })
      .limit(300);
    if (data.level) q = q.eq("sp_level", data.level);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const sids = [...new Set((rows ?? []).map((r) => r.student_id).filter(Boolean) as string[])];
    const { data: students } = sids.length
      ? await context.supabase.from("students").select("id, name, nis, rombel_id").in("id", sids)
      : { data: [] as any[] };
    const rids = [...new Set((students ?? []).map((s: any) => s.rombel_id).filter(Boolean))];
    const { data: rombel } = rids.length
      ? await context.supabase.from("rombel").select("id, name").in("id", rids as string[])
      : { data: [] as any[] };
    const sMap = new Map((students ?? []).map((s: any) => [s.id, s]));
    const rMap = new Map((rombel ?? []).map((r: any) => [r.id, r.name]));

    return (rows ?? []).map((r) => {
      const s: any = r.student_id ? sMap.get(r.student_id) : null;
      return {
        ...r,
        student_name: s?.name ?? "—",
        student_nis: s?.nis ?? "—",
        rombel_name: s?.rombel_id ? rMap.get(s.rombel_id) ?? "—" : "—",
      };
    });
  });

export const listAllStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("students")
      .select("id, name, nis, rombel_id")
      .order("name")
      .limit(2000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createSp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      studentId: z.string().uuid(),
      spLevel: z.number().int().min(1).max(3),
      tanggalRekaman: z.string(),
      alasan: z.string().min(3).max(1000),
      jumlahAlfa: z.number().int().min(0).optional(),
      jumlahTerlambat: z.number().int().min(0).optional(),
      dokumenPendukung: z.string().url().optional().or(z.literal("")),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sp_records").insert({
      student_id: data.studentId,
      sp_level: data.spLevel,
      tanggal_rekaman: data.tanggalRekaman,
      alasan: data.alasan,
      jumlah_alfa: data.jumlahAlfa ?? 0,
      jumlah_terlambat: data.jumlahTerlambat ?? 0,
      dokumen_pendukung: data.dokumenPendukung || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sp_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
