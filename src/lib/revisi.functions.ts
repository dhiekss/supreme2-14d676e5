import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAllowedRombelIds } from "@/lib/rombel-access";
import { z } from "zod";

const StatusEnum = z.enum(["H", "S", "I", "A"]);

export const listRevisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") }).parse)
  .handler(async ({ context, data }) => {
    // Revisi presensi terbuka untuk semua role — tidak dibatasi Akses Rombel.
    let q = context.supabase
      .from("attendance_revision_requests")
      .select("id, attendance_date, original_status, requested_status, alasan, status, rejection_reason, student_id, rombel_id, created_at, approved_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const sids = [...new Set(rows?.map((r) => r.student_id).filter(Boolean) as string[])];
    const rids = [...new Set(rows?.map((r) => r.rombel_id).filter(Boolean) as string[])];
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

export const createRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid(),
      studentId: z.string().uuid(),
      attendanceDate: z.string(),
      requestedStatus: StatusEnum,
      alasan: z.string().min(3).max(500),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    // find existing detail to capture original_status & attendance_detail_id
    const { data: rec } = await context.supabase
      .from("attendance_records")
      .select("id")
      .eq("rombel_id", data.rombelId)
      .eq("date", data.attendanceDate)
      .maybeSingle();

    let detailId: string | null = null;
    let original: string | null = null;
    if (rec) {
      const { data: det } = await context.supabase
        .from("attendance_details")
        .select("id, status")
        .eq("attendance_record_id", rec.id)
        .eq("student_id", data.studentId)
        .maybeSingle();
      if (det) {
        detailId = det.id;
        original = det.status;
      }
    }

    const { error } = await context.supabase.from("attendance_revision_requests").insert({
      attendance_detail_id: detailId,
      student_id: data.studentId,
      rombel_id: data.rombelId,
      attendance_date: data.attendanceDate,
      original_status: original,
      requested_status: data.requestedStatus,
      alasan: data.alasan,
      status: "pending",
      requested_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideRevision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: req, error: rErr } = await supabase
      .from("attendance_revision_requests")
      .select("id, student_id, rombel_id, attendance_date, requested_status, attendance_detail_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!req) throw new Error("Permintaan tidak ditemukan");
    if (req.status !== "pending") throw new Error("Permintaan sudah diproses");

    if (data.decision === "approved") {
      // ensure record exists
      let recordId: string | null = null;
      const { data: rec } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("rombel_id", req.rombel_id!)
        .eq("date", req.attendance_date!)
        .maybeSingle();
      if (rec) {
        recordId = rec.id;
      } else {
        const { data: ins, error: insErr } = await supabase
          .from("attendance_records")
          .insert({ rombel_id: req.rombel_id, date: req.attendance_date, officer_name: "Revisi", created_by: userId })
          .select("id").single();
        if (insErr) throw new Error(insErr.message);
        recordId = ins.id;
      }

      if (req.attendance_detail_id) {
        await supabase.from("attendance_details")
          .update({ status: req.requested_status })
          .eq("id", req.attendance_detail_id);
      } else {
        await supabase.from("attendance_details").insert({
          attendance_record_id: recordId!,
          student_id: req.student_id!,
          status: req.requested_status,
        });
      }
    }

    const { error } = await supabase
      .from("attendance_revision_requests")
      .update({
        status: data.decision,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: data.decision === "rejected" ? (data.rejectionReason ?? null) : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
