import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAllowedRombelIds } from "@/lib/rombel-access";
import { z } from "zod";

export const listRombel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const allowed = await getAllowedRombelIds(context.supabase, context.userId);
    let q = context.supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name")
      .order("tingkat")
      .order("name");
    if (allowed !== null) {
      if (allowed.length === 0) return [];
      q = q.in("id", allowed);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Unfiltered rombel list — for menus that must be accessible to all users
// regardless of Akses Rombel (e.g. Input Keterlambatan, Laporan Keterlambatan).
export const listRombelAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name")
      .order("tingkat")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getActiveSemester = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("semester")
      .select("id, nama, is_active")
      .eq("is_active", true)
      .maybeSingle();
    return data;
  });

export const listStudentsByRombel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ rombelId: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("students")
      .select("id, nis, name, gender")
      .eq("rombel_id", data.rombelId)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAttendanceForDate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ rombelId: z.string().uuid(), date: z.string() }).parse)
  .handler(async ({ context, data }) => {
    const { data: rec } = await context.supabase
      .from("attendance_records")
      .select("id, officer_name, date, rombel_id")
      .eq("rombel_id", data.rombelId)
      .eq("date", data.date)
      .maybeSingle();
    if (!rec) return { record: null, details: [] };
    const { data: details } = await context.supabase
      .from("attendance_details")
      .select("id, student_id, status")
      .eq("attendance_record_id", rec.id);
    return { record: rec, details: details ?? [] };
  });

const StatusEnum = z.enum(["H", "S", "I", "A", "P"]);

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    return data;
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid(),
      date: z.string(),
      officerName: z.string().min(1).max(200),
      entries: z.array(z.object({ studentId: z.string().uuid(), status: StatusEnum })).min(1).max(2000),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: semester } = await supabase
      .from("semester")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("rombel_id", data.rombelId)
      .eq("date", data.date)
      .maybeSingle();

    let recordId = existing?.id;
    if (!recordId) {
      const { data: inserted, error } = await supabase
        .from("attendance_records")
        .insert({
          rombel_id: data.rombelId,
          date: data.date,
          officer_name: data.officerName,
          created_by: userId,
          semester_id: semester?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      recordId = inserted.id;
    } else {
      await supabase
        .from("attendance_records")
        .update({ officer_name: data.officerName })
        .eq("id", recordId);
      await supabase.from("attendance_details").delete().eq("attendance_record_id", recordId);
    }

    const rows = data.entries.map((e) => ({
      attendance_record_id: recordId,
      student_id: e.studentId,
      status: e.status,
    }));
    const { error: detErr } = await supabase.from("attendance_details").insert(rows);
    if (detErr) throw new Error(detErr.message);

    return { ok: true, recordId };
  });
