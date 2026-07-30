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
    const fetchAll = async <T = any>(build: (from: number, to: number) => any, pageSize = 1000): Promise<T[]> => {
      const out: T[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await build(from, from + pageSize - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as T[];
        out.push(...rows);
        if (rows.length < pageSize) break;
      }
      return out;
    };
    const safe = async <T = any>(p: any): Promise<T[]> => {
      try {
        const { data, error } = await p;
        if (error) return [];
        return (data ?? []) as T[];
      } catch {
        return [];
      }
    };

    const [studentsData, rombelData, tIn, tOut, tPindah, tKeluar] = await Promise.all([
      fetchAll((f, t) => context.supabase.from("students").select("id, name, nis, nisn, gender, rombel_id").order("name").range(f, t)),
      fetchAll((f, t) => context.supabase.from("rombel").select("id, name, wali_kelas_name, tingkat, konsentrasi_keahlian").range(f, t)),
      safe(context.supabase.from("student_transfers_in").select("student_id, dapodik_status, dapodik_tanggal")),
      safe(context.supabase.from("student_transfers_out").select("student_id, dapodik_status, dapodik_tanggal")),
      safe(context.supabase.from("student_rombel_transfers").select("student_id, dapodik_status, dapodik_tanggal")),
      safe(context.supabase.from("student_resignations").select("student_id, dapodik_status, dapodik_tanggal")),
    ]);
    const dapodik = new Map<string, { status: string | null; tanggal: string | null }>();
    for (const row of [...tIn, ...tOut, ...tPindah, ...tKeluar] as any[]) {
      if (!row?.student_id) continue;
      const prev = dapodik.get(row.student_id);
      const cur = { status: row.dapodik_status ?? null, tanggal: row.dapodik_tanggal ?? null };
      if (!prev || String(cur.tanggal ?? "") >= String(prev.tanggal ?? "")) dapodik.set(row.student_id, cur);
    }
    const rMap = new Map((rombelData ?? []).map((x: any) => [x.id, x]));
    return (studentsData ?? []).map((x: any) => {
      const rb: any = x.rombel_id ? rMap.get(x.rombel_id) : null;
      const d = dapodik.get(x.id);
      return {
        ...x,
        rombel_nama: rb?.name ?? "—",
        wali_kelas_name: rb?.wali_kelas_name ?? "—",
        tingkat: rb?.tingkat ?? null,
        konsentrasi_keahlian: rb?.konsentrasi_keahlian ?? null,
        dapodik_status: d?.status ?? null,
        dapodik_tanggal: d?.tanggal ?? null,
      };
    });
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
    let before: any = null;
    if (id) {
      const { data: prev } = await context.supabase
        .from("students")
        .select("name, nis, nisn, gender")
        .eq("id", id)
        .maybeSingle();
      before = prev ?? null;
    }
    const r = id
      ? await context.supabase.from("students").update(payload).eq("id", id)
      : await context.supabase.from("students").insert(payload);
    if (r.error) throw new Error(r.error.message);

    if (id && before) {
      const fields = ["name", "nis", "nisn", "gender"] as const;
      const changes = fields
        .filter((f) => f in payload && String((before as any)[f] ?? "") !== String((payload as any)[f] ?? ""))
        .map((f) => ({ field: f, from: (before as any)[f] ?? null, to: (payload as any)[f] ?? null }));
      if (changes.length) {
        const { data: prof } = await context.supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", context.userId)
          .maybeSingle();
        await context.supabase.from("student_identity_logs").insert({
          student_id: id,
          changed_by: context.userId,
          changed_by_name: prof?.full_name ?? null,
          changed_by_email: prof?.email ?? null,
          changes,
        });
      }
    }
    return { ok: true };
  });

export const listStudentIdentityLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ student_id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("student_identity_logs")
      .select("id, created_at, changed_by_name, changed_by_email, changes")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
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
