import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type DaftarHadirRombelData = {
  rombel: { id: string; name: string; tingkat: string | null; konsentrasi_keahlian: string | null; wali_kelas_name: string | null; wali_kelas_nip: string | null };
  students: { id: string; nis: string | null; name: string; gender: string | null }[];
  /** map studentId -> map dateISO -> status ("H"|"S"|"I"|"A"|"P") */
  attendance: Record<string, Record<string, string>>;
};

export type DaftarHadirData = {
  month: number; // 1..12
  year: number;
  tahun_ajaran: string | null;
  /** dates (YYYY-MM-DD) marked as libur/non-efektif within the month */
  liburDates: string[];
  rombels: DaftarHadirRombelData[];
};

export const monthlyAttendanceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
      rombelIds: z.array(z.string().uuid()).min(1).max(100),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const start = `${data.year}-${String(data.month).padStart(2, "0")}-01`;
    const lastDay = new Date(data.year, data.month, 0).getDate();
    const end = `${data.year}-${String(data.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Rombel meta
    const { data: rombelRows, error: rErr } = await supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name, wali_kelas_nip")
      .in("id", data.rombelIds);
    if (rErr) throw new Error(rErr.message);

    // Tahun ajaran aktif
    const { data: ta } = await supabase
      .from("tahun_ajaran")
      .select("nama, is_active")
      .eq("is_active", true)
      .maybeSingle();

    // Libur
    const { data: liburRows } = await supabase
      .from("hari_efektif")
      .select("tanggal, jenis")
      .gte("tanggal", start)
      .lte("tanggal", end)
      .eq("jenis", "libur");
    const liburDates = (liburRows ?? []).map((r: any) => String(r.tanggal));

    const rombels: DaftarHadirRombelData[] = [];

    for (const rid of data.rombelIds) {
      const meta = (rombelRows ?? []).find((r: any) => r.id === rid);
      if (!meta) continue;

      // Students
      const { data: students } = await supabase
        .from("students")
        .select("id, nis, name, gender")
        .eq("rombel_id", rid)
        .order("name");

      // Records for this rombel in month
      const { data: records } = await supabase
        .from("attendance_records")
        .select("id, date")
        .eq("rombel_id", rid)
        .gte("date", start)
        .lte("date", end);
      const recIds = (records ?? []).map((r: any) => r.id);
      const dateById: Record<string, string> = {};
      for (const r of records ?? []) dateById[(r as any).id] = String((r as any).date);

      const attendance: Record<string, Record<string, string>> = {};
      if (recIds.length > 0) {
        // page in chunks of 1000
        let offset = 0;
        while (true) {
          const { data: details } = await supabase
            .from("attendance_details")
            .select("attendance_record_id, student_id, status")
            .in("attendance_record_id", recIds)
            .range(offset, offset + 999);
          const chunk = details ?? [];
          for (const d of chunk) {
            const dt = dateById[(d as any).attendance_record_id];
            if (!dt) continue;
            const sid = String((d as any).student_id);
            const st = String((d as any).status);
            if (!attendance[sid]) attendance[sid] = {};
            attendance[sid][dt] = st;
          }
          if (chunk.length < 1000) break;
          offset += 1000;
        }
      }

      rombels.push({
        rombel: {
          id: String(meta.id),
          name: String(meta.name),
          tingkat: (meta as any).tingkat ?? null,
          konsentrasi_keahlian: (meta as any).konsentrasi_keahlian ?? null,
          wali_kelas_name: (meta as any).wali_kelas_name ?? null,
          wali_kelas_nip: (meta as any).wali_kelas_nip ?? null,
        },
        students: (students ?? []) as any,
        attendance,
      });
    }

    return {
      month: data.month,
      year: data.year,
      tahun_ajaran: ta?.nama ?? null,
      liburDates,
      rombels,
    } as DaftarHadirData;
  });
