import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

export const listStudentsByRombel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ rombel_id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("students")
      .select("id, name, nis, nisn, gender")
      .eq("rombel_id", data.rombel_id)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAllStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [s, r] = await Promise.all([
      context.supabase.from("students").select("id, name, nis, nisn, gender, rombel_id").order("name").range(0, 99999),
      context.supabase.from("rombel").select("id, name").range(0, 9999),
    ]);
    if (s.error) throw new Error(s.error.message);
    if (r.error) throw new Error(r.error.message);
    const rMap = new Map((r.data ?? []).map((x: any) => [x.id, x.name]));
    return (s.data ?? []).map((x: any) => ({ ...x, rombel_nama: x.rombel_id ? rMap.get(x.rombel_id) ?? "—" : "—" }));
  });


const StudentInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(150),
  nis: z.string().trim().max(30).optional().nullable(),
  nisn: z.string().trim().max(30).optional().nullable(),
  gender: z.enum(["L", "P"]).optional().nullable(),
  rombel_id: uuid.optional().nullable(),
});

export const saveStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(StudentInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    const r = id
      ? await context.supabase.from("students").update(payload).eq("id", id)
      : await context.supabase.from("students").insert(payload);
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const removeStudentFromRombel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("students").update({ rombel_id: null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ IMPORT ============
const BulkStudents = z.object({
  rows: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    nis: z.string().trim().max(30).optional().nullable(),
    nisn: z.string().trim().max(30).optional().nullable(),
    gender: z.string().trim().max(5).optional().nullable(),
    rombel_name: z.string().trim().max(100).optional().nullable(),
  })).min(1).max(2000),
});

export const bulkImportStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(BulkStudents.parse)
  .handler(async ({ context, data }) => {
    const { data: rombels, error: re } = await context.supabase.from("rombel").select("id, name");
    if (re) throw new Error(re.message);
    const rMap = new Map((rombels ?? []).map((x: any) => [String(x.name ?? "").toLowerCase(), x.id]));
    const payload = data.rows.map((r) => ({
      name: r.name,
      nis: r.nis || null,
      nisn: r.nisn || null,
      gender: r.gender && /^[lLpP]/.test(r.gender) ? (r.gender.toUpperCase().startsWith("L") ? "L" : "P") : null,
      rombel_id: r.rombel_name ? rMap.get(r.rombel_name.toLowerCase()) ?? null : null,
    }));
    const { error } = await context.supabase.from("students").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, count: payload.length };
  });

const ImportNisn = z.object({
  rombel_id: uuid,
  nisns: z.array(z.string().trim().min(1).max(30)).min(1).max(2000),
});

export const importNisnToRombel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(ImportNisn.parse)
  .handler(async ({ context, data }) => {
    const { error, count } = await context.supabase
      .from("students")
      .update({ rombel_id: data.rombel_id }, { count: "exact" })
      .in("nisn", data.nisns);
    if (error) throw new Error(error.message);
    return { ok: true, count: count ?? 0 };
  });

const BulkRombel = z.object({
  rows: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    tingkat: z.string().trim().max(20).optional().nullable(),
    konsentrasi_keahlian: z.string().trim().max(100).optional().nullable(),
    wali_kelas_name: z.string().trim().max(100).optional().nullable(),
    wali_kelas_nip: z.string().trim().max(50).optional().nullable(),
    is_khusus: z.boolean().optional(),
  })).min(1).max(500),
});

export const bulkImportRombel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(BulkRombel.parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("rombel").insert(data.rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.rows.length };
  });
