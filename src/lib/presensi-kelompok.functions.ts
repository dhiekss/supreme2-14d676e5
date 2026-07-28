import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listKelompokForPresensi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("kelompok_belajar")
      .select("id, nama")
      .order("nama");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listStudentsByKelompok = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kelompokId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: ang, error } = await supabase
      .from("kelompok_belajar_anggota")
      .select("student_id")
      .eq("kelompok_id", data.kelompokId);
    if (error) throw new Error(error.message);
    const ids = (ang ?? []).map((a: any) => a.student_id).filter(Boolean);
    if (ids.length === 0) return [];
    const { data: students, error: sErr } = await supabase
      .from("students")
      .select("id, name, nis, gender, rombel_id")
      .in("id", ids)
      .order("name");
    if (sErr) throw new Error(sErr.message);
    const rombelIds = Array.from(new Set((students ?? []).map((s: any) => s.rombel_id).filter(Boolean)));
    let rombelMap = new Map<string, any>();
    if (rombelIds.length) {
      const { data: r } = await supabase.from("rombel").select("id, name, tingkat").in("id", rombelIds);
      rombelMap = new Map(((r ?? []) as any[]).map((x) => [x.id, x]));
    }
    return (students ?? []).map((s: any) => {
      const r = s.rombel_id ? rombelMap.get(s.rombel_id) : null;
      return {
        id: s.id as string,
        name: s.name as string,
        nis: (s.nis as string) ?? null,
        gender: (s.gender as string) ?? null,
        rombel_id: (s.rombel_id as string) ?? null,
        rombel_name: r?.name ?? null,
        rombel_tingkat: r?.tingkat ?? null,
      };
    });
  });

export const getAttendanceForKelompokDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kelompokId: z.string().uuid(), date: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: ang } = await supabase
      .from("kelompok_belajar_anggota")
      .select("student_id")
      .eq("kelompok_id", data.kelompokId);
    const studentIds = (ang ?? []).map((a: any) => a.student_id).filter(Boolean);
    if (studentIds.length === 0) return { details: [] as { student_id: string; status: string }[] };
    const { data: students } = await supabase
      .from("students")
      .select("id, rombel_id")
      .in("id", studentIds);
    const rombelIds = Array.from(
      new Set(((students ?? []) as any[]).map((s) => s.rombel_id).filter(Boolean)),
    );
    if (rombelIds.length === 0) return { details: [] };
    const { data: records } = await supabase
      .from("attendance_records")
      .select("id, rombel_id")
      .in("rombel_id", rombelIds)
      .eq("date", data.date);
    const recIds = (records ?? []).map((r: any) => r.id);
    if (recIds.length === 0) return { details: [] };
    const { data: details } = await supabase
      .from("attendance_details")
      .select("student_id, status")
      .in("attendance_record_id", recIds)
      .in("student_id", studentIds);
    return { details: (details ?? []) as { student_id: string; status: string }[] };
  });

const StatusEnum = z.enum(["H", "S", "I", "A", "P"]);

export const saveAttendanceKelompok = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d) =>
      z
        .object({
          kelompokId: z.string().uuid(),
          date: z.string(),
          officerName: z.string().min(1).max(200),
          entries: z
            .array(z.object({ studentId: z.string().uuid(), status: StatusEnum }))
            .min(1)
            .max(2000),
        })
        .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: semester } = await supabase
      .from("semester")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    const studentIds = data.entries.map((e) => e.studentId);
    const { data: students, error: sErr } = await supabase
      .from("students")
      .select("id, rombel_id")
      .in("id", studentIds);
    if (sErr) throw new Error(sErr.message);

    const stuRombel = new Map<string, string>();
    for (const s of (students ?? []) as any[]) {
      if (s.rombel_id) stuRombel.set(s.id, s.rombel_id);
    }

    // Group entries by rombel
    const byRombel = new Map<string, { studentId: string; status: string }[]>();
    const skipped: string[] = [];
    for (const e of data.entries) {
      const rid = stuRombel.get(e.studentId);
      if (!rid) {
        skipped.push(e.studentId);
        continue;
      }
      if (!byRombel.has(rid)) byRombel.set(rid, []);
      byRombel.get(rid)!.push(e);
    }

    let savedCount = 0;
    for (const [rombelId, entries] of byRombel) {
      // Get or create attendance_records
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("rombel_id", rombelId)
        .eq("date", data.date)
        .maybeSingle();

      let recordId = existing?.id as string | undefined;
      if (!recordId) {
        const { data: inserted, error } = await supabase
          .from("attendance_records")
          .insert({
            rombel_id: rombelId,
            date: data.date,
            officer_name: data.officerName,
            created_by: userId,
            semester_id: semester?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        recordId = inserted.id as string;
      } else {
        await supabase
          .from("attendance_records")
          .update({ officer_name: data.officerName })
          .eq("id", recordId);
      }

      const sids = entries.map((e) => e.studentId);
      // Upsert per-student: delete existing details for these students in this record, then insert
      await supabase
        .from("attendance_details")
        .delete()
        .eq("attendance_record_id", recordId)
        .in("student_id", sids);

      const rows = entries.map((e) => ({
        attendance_record_id: recordId,
        student_id: e.studentId,
        status: e.status,
      }));
      const { error: detErr } = await supabase.from("attendance_details").insert(rows);
      if (detErr) throw new Error(detErr.message);
      savedCount += rows.length;
    }

    return { ok: true, saved: savedCount, skipped };
  });
