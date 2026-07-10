import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listKeterlambatan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      rombelId: z.string().uuid().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("late_records")
      .select("id, student_id, rombel_id, record_date, recorded_at, created_at")
      .order("record_date", { ascending: false })
      .order("recorded_at", { ascending: false })
      .limit(300);
    if (data.from) q = q.gte("record_date", data.from);
    if (data.to) q = q.lte("record_date", data.to);
    if (data.rombelId) q = q.eq("rombel_id", data.rombelId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const sids = [...new Set((rows ?? []).map((r) => r.student_id).filter(Boolean) as string[])];
    const rids = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean) as string[])];
    const [students, rombel] = await Promise.all([
      sids.length ? context.supabase.from("students").select("id, name, nis").in("id", sids) : Promise.resolve({ data: [] }),
      rids.length ? context.supabase.from("rombel").select("id, name").in("id", rids) : Promise.resolve({ data: [] }),
    ]);
    const sMap = new Map((students.data ?? []).map((x: any) => [x.id, x]));
    const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));

    return (rows ?? []).map((r) => ({
      ...r,
      student_name: r.student_id ? (sMap.get(r.student_id) as any)?.name ?? "—" : "—",
      student_nis: r.student_id ? (sMap.get(r.student_id) as any)?.nis ?? "—" : "—",
      rombel_name: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
    }));
  });

export const createKeterlambatan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      studentId: z.string().uuid(),
      rombelId: z.string().uuid(),
      recordDate: z.string(),
      recordedAt: z.string().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { data: sem } = await context.supabase
      .from("semester")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    const { error } = await context.supabase.from("late_records").insert({
      student_id: data.studentId,
      rombel_id: data.rombelId,
      record_date: data.recordDate,
      recorded_at: data.recordedAt ?? new Date().toISOString(),
      recorded_by: context.userId,
      semester_id: sem?.id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKeterlambatan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("late_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStudentsByRombel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ rombelId: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("students")
      .select("id, name, nis")
      .eq("rombel_id", data.rombelId)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
