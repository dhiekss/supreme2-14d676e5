import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PAGE = 1000;

async function fetchAllPaged<T>(build: () => any): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 100; i++) {
    const { data, error } = await build().range(i * PAGE, i * PAGE + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

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
    const rows = await fetchAllPaged<any>(() => {
      let q = context.supabase
        .from("late_records")
        .select("id, student_id, rombel_id, record_date, recorded_at, created_at, recorded_by")
        .order("record_date", { ascending: false })
        .order("recorded_at", { ascending: false })
        .order("id", { ascending: false });
      if (data.from) q = q.gte("record_date", data.from);
      if (data.to) q = q.lte("record_date", data.to);
      if (data.rombelId) q = q.eq("rombel_id", data.rombelId);
      return q;
    });


    const sids = [...new Set((rows ?? []).map((r) => r.student_id).filter(Boolean) as string[])];
    const rids = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean) as string[])];
    const uids = [...new Set((rows ?? []).map((r) => r.recorded_by).filter(Boolean) as string[])];
    const inChunks = async (table: string, cols: string, ids: string[]) => {
      const out: any[] = [];
      for (let i = 0; i < ids.length; i += 300) {
        const { data: d, error } = await context.supabase
          .from(table as any)
          .select(cols)
          .in("id", ids.slice(i, i + 300));
        if (error) throw new Error(error.message);
        out.push(...((d ?? []) as any[]));
      }
      return out;
    };
    const [students, rombel, profiles] = await Promise.all([
      inChunks("students", "id, name, nis", sids),
      inChunks("rombel", "id, name, konsentrasi_keahlian", rids),
      inChunks("profiles", "id, full_name", uids),
    ]);

    const sMap = new Map(students.map((x: any) => [x.id, x]));
    const rMap = new Map(rombel.map((x: any) => [x.id, x]));
    const pMap = new Map(profiles.map((x: any) => [x.id, x.full_name]));


    return (rows ?? []).map((r) => ({
      ...r,
      student_name: r.student_id ? (sMap.get(r.student_id) as any)?.name ?? "—" : "—",
      student_nis: r.student_id ? (sMap.get(r.student_id) as any)?.nis ?? "—" : "—",
      rombel_name: r.rombel_id ? (rMap.get(r.rombel_id) as any)?.name ?? "—" : "—",
      konsentrasi: r.rombel_id ? (rMap.get(r.rombel_id) as any)?.konsentrasi_keahlian ?? "—" : "—",
      penginput_name: r.recorded_by ? pMap.get(r.recorded_by) ?? "—" : "—",
    }));
  });

// Directory of all rombel with student totals + konsentrasi — used for
// "X dari Y siswa" ranking on the Laporan Keterlambatan page.
export const listRombelDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [rombel, students] = await Promise.all([
      fetchAllPaged<any>(() => context.supabase.from("rombel").select("id, name, konsentrasi_keahlian").order("id")),
      fetchAllPaged<any>(() => context.supabase.from("students").select("id, rombel_id").order("id")),
    ]);

    const countByRombel = new Map<string, number>();
    for (const s of students ?? []) {
      if (!s.rombel_id) continue;
      countByRombel.set(s.rombel_id, (countByRombel.get(s.rombel_id) ?? 0) + 1);
    }
    return (rombel ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      konsentrasi: r.konsentrasi_keahlian ?? "—",
      total_students: countByRombel.get(r.id) ?? 0,
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
    const { data: existing } = await context.supabase
      .from("late_records")
      .select("id, recorded_at, recorded_by, rombel_id, student_id")
      .eq("student_id", data.studentId)
      .eq("record_date", data.recordDate)
      .maybeSingle();
    if (existing) {
      const [{ data: student }, { data: rombel }, { data: profile }] = await Promise.all([
        existing.student_id
          ? context.supabase.from("students").select("name, nis").eq("id", existing.student_id).maybeSingle()
          : Promise.resolve({ data: null as any }),
        existing.rombel_id
          ? context.supabase.from("rombel").select("name").eq("id", existing.rombel_id).maybeSingle()
          : Promise.resolve({ data: null as any }),
        existing.recorded_by
          ? context.supabase.from("profiles").select("full_name").eq("id", existing.recorded_by).maybeSingle()
          : Promise.resolve({ data: null as any }),
      ]);
      throw new Error(
        "DUPLICATE_LATE_RECORD::" +
          JSON.stringify({
            studentName: (student as any)?.name ?? "—",
            studentNis: (student as any)?.nis ?? null,
            rombelName: (rombel as any)?.name ?? "—",
            recordedAt: existing.recorded_at,
            recordedByName: (profile as any)?.full_name ?? "—",
          }),
      );
    }

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
