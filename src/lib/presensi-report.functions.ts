import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const presensiReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid(),
      from: z.string(),
      to: z.string(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    const { data: students, error: sErr } = await supabase
      .from("students")
      .select("id, nis, name")
      .eq("rombel_id", data.rombelId)
      .order("name");
    if (sErr) throw new Error(sErr.message);

    const { data: records, error: rErr } = await supabase
      .from("attendance_records")
      .select("id, date")
      .eq("rombel_id", data.rombelId)
      .gte("date", data.from)
      .lte("date", data.to)
      .order("date");
    if (rErr) throw new Error(rErr.message);

    const recordIds = (records ?? []).map((r) => r.id);
    const { data: details } = recordIds.length
      ? await supabase
          .from("attendance_details")
          .select("attendance_record_id, student_id, status")
          .in("attendance_record_id", recordIds)
      : { data: [] as any[] };

    // index: studentId -> { H, S, I, A }
    const summary = new Map<string, { H: number; S: number; I: number; A: number }>();
    for (const s of students ?? []) summary.set(s.id, { H: 0, S: 0, I: 0, A: 0 });
    for (const d of details ?? []) {
      const row = summary.get(d.student_id);
      if (!row) continue;
      const st = d.status as "H" | "S" | "I" | "A";
      if (st in row) row[st]++;
    }

    return {
      totalDays: (records ?? []).length,
      students: (students ?? []).map((s) => ({
        id: s.id,
        nis: s.nis,
        name: s.name,
        ...(summary.get(s.id) ?? { H: 0, S: 0, I: 0, A: 0 }),
      })),
    };
  });
