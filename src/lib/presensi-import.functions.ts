import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const StatusEnum = z.enum(["H", "S", "I", "A", "P"]);

const RowSchema = z.object({
  tanggal: z.string().min(1), // ISO YYYY-MM-DD
  rombel_name: z.string().min(1),
  officer_name: z.string().min(1),
  student_name: z.string().min(1),
  nis: z.string().optional().nullable(),
  status: StatusEnum,
});

export const importAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ rows: z.array(RowSchema).min(1).max(10000) }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Load lookups: rombel, students, active semester
    const pageSize = 1000;
    const rombelMap = new Map<string, string>(); // name (upper) -> id
    {
      const { data: rows, error } = await supabase
        .from("rombel")
        .select("id, name");
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) rombelMap.set(String((r as any).name).trim().toUpperCase(), (r as any).id);
    }

    const studentsByNis = new Map<string, { id: string; rombel_id: string | null }>();
    const studentsByNameRombel = new Map<string, { id: string; rombel_id: string | null }>();
    {
      let from = 0;
      while (true) {
        const { data: rows, error } = await supabase
          .from("students")
          .select("id, name, nis, rombel_id")
          .range(from, from + pageSize - 1);
        if (error) throw new Error(error.message);
        const list = rows ?? [];
        for (const s of list as any[]) {
          if (s.nis) studentsByNis.set(String(s.nis).trim(), { id: s.id, rombel_id: s.rombel_id });
          if (s.name) studentsByNameRombel.set(
            `${String(s.name).trim().toUpperCase()}|${s.rombel_id ?? ""}`,
            { id: s.id, rombel_id: s.rombel_id },
          );
        }
        if (list.length < pageSize) break;
        from += pageSize;
      }
    }

    const { data: semester } = await supabase
      .from("semester").select("id").eq("is_active", true).maybeSingle();

    // Group rows by (rombel_id, date)
    type Detail = { student_id: string; status: string };
    const groups = new Map<string, { rombel_id: string; date: string; officer_name: string; entries: Detail[] }>();
    const errors: Array<{ row: number; reason: string }> = [];

    data.rows.forEach((r, idx) => {
      const rombelKey = r.rombel_name.trim().toUpperCase();
      const rombel_id = rombelMap.get(rombelKey);
      if (!rombel_id) {
        errors.push({ row: idx + 2, reason: `Rombel tidak ditemukan: ${r.rombel_name}` });
        return;
      }
      let student: { id: string; rombel_id: string | null } | undefined;
      if (r.nis) student = studentsByNis.get(String(r.nis).trim());
      if (!student) student = studentsByNameRombel.get(`${r.student_name.trim().toUpperCase()}|${rombel_id}`);
      if (!student) {
        errors.push({ row: idx + 2, reason: `Murid tidak ditemukan: ${r.student_name}${r.nis ? ` (NIS ${r.nis})` : ""}` });
        return;
      }
      const key = `${rombel_id}|${r.tanggal}`;
      const g = groups.get(key) ?? { rombel_id, date: r.tanggal, officer_name: r.officer_name, entries: [] };
      g.officer_name = r.officer_name || g.officer_name;
      g.entries.push({ student_id: student.id, status: r.status });
      groups.set(key, g);
    });

    let recordsCreated = 0;
    let recordsUpdated = 0;
    let detailsInserted = 0;

    for (const g of groups.values()) {
      const { data: existing } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("rombel_id", g.rombel_id)
        .eq("date", g.date)
        .maybeSingle();

      let recordId = existing?.id as string | undefined;
      if (!recordId) {
        const { data: inserted, error } = await supabase
          .from("attendance_records")
          .insert({
            rombel_id: g.rombel_id,
            date: g.date,
            officer_name: g.officer_name,
            created_by: userId,
            semester_id: semester?.id ?? null,
          })
          .select("id")
          .single();
        if (error) { errors.push({ row: 0, reason: `Gagal buat record ${g.date}: ${error.message}` }); continue; }
        recordId = inserted.id;
        recordsCreated++;
      } else {
        await supabase.from("attendance_records").update({ officer_name: g.officer_name }).eq("id", recordId);
        await supabase.from("attendance_details").delete().eq("attendance_record_id", recordId);
        recordsUpdated++;
      }

      // Dedupe within group by student_id (last wins)
      const byStudent = new Map<string, string>();
      for (const e of g.entries) byStudent.set(e.student_id, e.status);
      const rows = [...byStudent.entries()].map(([student_id, status]) => ({
        attendance_record_id: recordId!, student_id, status,
      }));
      const { error: detErr } = await supabase.from("attendance_details").insert(rows);
      if (detErr) { errors.push({ row: 0, reason: `Gagal simpan detail ${g.date}: ${detErr.message}` }); continue; }
      detailsInserted += rows.length;
    }

    return {
      ok: true,
      recordsCreated,
      recordsUpdated,
      detailsInserted,
      totalGroups: groups.size,
      totalRows: data.rows.length,
      errors,
    };
  });
