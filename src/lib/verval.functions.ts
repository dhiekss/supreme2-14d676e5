import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ListSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
}).optional();

export const listVerval = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ListSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("verval_siswa")
      .select("id, student_id, nisn, nama_perbaikan, tempat_lahir, tanggal_lahir, agama, nama_ayah, nama_ibu, status, catatan_perbaikan, validated_at, created_at, students(name, nis)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data?.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let filtered = rows ?? [];
    if (data?.search) {
      const s = data.search.toLowerCase();
      filtered = filtered.filter((r: any) =>
        (r.students?.name ?? "").toLowerCase().includes(s) ||
        (r.students?.nis ?? "").toLowerCase().includes(s) ||
        (r.nisn ?? "").toLowerCase().includes(s),
      );
    }
    return filtered;
  });

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  student_id: z.string().uuid(),
  nisn: z.string().optional().nullable(),
  nama_perbaikan: z.string().optional().nullable(),
  tempat_lahir: z.string().optional().nullable(),
  tanggal_lahir: z.string().optional().nullable(),
  agama: z.string().optional().nullable(),
  nama_ayah: z.string().optional().nullable(),
  nama_ibu: z.string().optional().nullable(),
  status: z.string().default("pending"),
  catatan_perbaikan: z.string().optional().nullable(),
});

export const upsertVerval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = { ...data, updated_at: new Date().toISOString() };
    if (!data.id) payload.created_by = userId;
    const { error } = data.id
      ? await supabase.from("verval_siswa").update(payload).eq("id", data.id)
      : await supabase.from("verval_siswa").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const validateVerval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(["valid", "tolak", "pending"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("verval_siswa")
      .update({
        status: data.status,
        validated_by: data.status === "pending" ? null : userId,
        validated_at: data.status === "pending" ? null : new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVerval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("verval_siswa").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const summaryVerval = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("verval_siswa")
      .select("status")
      .limit(5000);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = { pending: 0, valid: 0, tolak: 0 };
    for (const r of data ?? []) {
      const s = (r as any).status ?? "pending";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  });

export const listStudentsForVerval = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("students")
      .select("id, name, nis, nisn")
      .order("name")
      .limit(2000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
