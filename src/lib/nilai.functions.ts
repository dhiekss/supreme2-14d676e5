import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const assignmentId = z.string().uuid();
const objectiveType = z.enum(["tp", "final_test", "sikap"]);
const modelType = z.enum(["tes_tertulis", "praktik", "portofolio", "proyek", "observasi"]);

async function activeSemester(s: any) {
  const { data, error } = await s.from("semester").select("id, nama, tahun_ajaran_id").eq("is_active", true).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Semester aktif belum ditentukan");
  return data as { id: string; nama: string | null; tahun_ajaran_id: string | null };
}

async function canManageAssignment(s: any, userId: string, id: string) {
  const [{ data: isAdmin }, { data: isSuper }, { data: assignment }] = await Promise.all([
    s.rpc("has_role", { _user_id: userId, _role: "admin" }),
    s.rpc("has_role", { _user_id: userId, _role: "superadmin" }),
    s.from("rombel_mata_pelajaran").select("id, guru_id, deleted_at").eq("id", id).maybeSingle(),
  ]);
  if (!assignment || (assignment as any).deleted_at) return false;
  if (isAdmin || isSuper) return true;
  const [{ data: profile }, { data: guru }] = await Promise.all([
    s.from("profiles").select("nip").eq("id", userId).maybeSingle(),
    s.from("guru").select("nip").eq("id", (assignment as any).guru_id).maybeSingle(),
  ]);
  return Boolean((profile as any)?.nip && (profile as any).nip === (guru as any)?.nip);
}

async function requireAssignment(s: any, userId: string, id: string) {
  if (!(await canManageAssignment(s, userId, id))) throw new Error("Anda tidak memiliki akses untuk mengelola nilai kelas ini");
}

export const listNilaiAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const semester = await activeSemester(s);
    const [{ data: isAdmin }, { data: isSuper }, { data: profile }] = await Promise.all([
      s.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      s.rpc("has_role", { _user_id: context.userId, _role: "superadmin" }),
      s.from("profiles").select("nip").eq("id", context.userId).maybeSingle(),
    ]);
    let guruIds: string[] | null = null;
    if (!isAdmin && !isSuper) {
      const nip = (profile as any)?.nip;
      if (!nip) return { semester, assignments: [] };
      const { data: gurus, error } = await s.from("guru").select("id").eq("nip", nip);
      if (error) throw new Error(error.message);
      guruIds = (gurus ?? []).map((g: any) => g.id);
      if (!guruIds.length) return { semester, assignments: [] };
    }
    let q = s.from("rombel_mata_pelajaran")
      .select("id, rombel_id, mata_pelajaran_id, guru_id, semester_id")
      .is("deleted_at", null)
      .or(`semester_id.eq.${semester.id},semester_id.is.null`);
    if (guruIds) q = q.in("guru_id", guruIds);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const rIds = [...new Set((rows ?? []).map((r: any) => r.rombel_id).filter(Boolean))];
    const mIds = [...new Set((rows ?? []).map((r: any) => r.mata_pelajaran_id).filter(Boolean))];
    const gIds = [...new Set((rows ?? []).map((r: any) => r.guru_id).filter(Boolean))];
    const [rr, mr, gr] = await Promise.all([
      rIds.length ? s.from("rombel").select("id, name").in("id", rIds) : Promise.resolve({ data: [] }),
      mIds.length ? s.from("mata_pelajaran").select("id, nama, kode").in("id", mIds) : Promise.resolve({ data: [] }),
      gIds.length ? s.from("guru").select("id, nama, nip").in("id", gIds) : Promise.resolve({ data: [] }),
    ]);
    const rm = new Map((rr.data ?? []).map((x: any) => [x.id, x]));
    const mm = new Map((mr.data ?? []).map((x: any) => [x.id, x]));
    const gm = new Map((gr.data ?? []).map((x: any) => [x.id, x]));
    const assignments = (rows ?? []).map((x: any) => ({
      ...x,
      rombel_name: (rm.get(x.rombel_id) as any)?.name ?? "—",
      mapel_name: (mm.get(x.mata_pelajaran_id) as any)?.nama ?? "—",
      mapel_code: (mm.get(x.mata_pelajaran_id) as any)?.kode ?? null,
      guru_name: (gm.get(x.guru_id) as any)?.nama ?? "—",
      guru_nip: (gm.get(x.guru_id) as any)?.nip ?? null,
    })).sort((a: any, b: any) => `${a.rombel_name}${a.mapel_name}`.localeCompare(`${b.rombel_name}${b.mapel_name}`));
    return { semester, assignments };
  });

export const getNilaiWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assignment_id: assignmentId }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    await requireAssignment(s, context.userId, data.assignment_id);
    const semester = await activeSemester(s);
    const { data: assignment, error: aError } = await s.from("rombel_mata_pelajaran")
      .select("id, rombel_id, mata_pelajaran_id, guru_id").eq("id", data.assignment_id).maybeSingle();
    if (aError || !assignment) throw new Error(aError?.message ?? "Penugasan tidak ditemukan");
    const [{ data: students, error: stError }, { data: objectives, error: tpError }] = await Promise.all([
      s.from("students").select("id, name, nis").eq("rombel_id", (assignment as any).rombel_id).order("name"),
      s.from("tujuan_pembelajaran").select("id, kode_tp, deskripsi, model_penilaian, urutan, is_active, komponen_type, bobot, tanggal_rencana_penilaian, semester_id")
        .eq("rombel_mata_pelajaran_id", data.assignment_id).or(`semester_id.eq.${semester.id},semester_id.is.null`).order("urutan"),
    ]);
    if (stError) throw new Error(stError.message);
    if (tpError) throw new Error(tpError.message);
    const objectiveIds = (objectives ?? []).map((x: any) => x.id);
    const grades: any[] = [];
    if (objectiveIds.length) {
      for (let i = 0; i < objectiveIds.length; i += 150) {
        let from = 0;
        while (true) {
          const { data: chunk, error } = await s.from("nilai_siswa")
            .select("id, tujuan_pembelajaran_id, student_id, nilai, catatan")
            .in("tujuan_pembelajaran_id", objectiveIds.slice(i, i + 150))
            .or(`semester_id.eq.${semester.id},semester_id.is.null`)
            .range(from, from + 999);
          if (error) throw new Error(error.message);
          grades.push(...(chunk ?? []));
          if (!chunk || chunk.length < 1000) break;
          from += 1000;
        }
      }
    }
    return { students: students ?? [], objectives: objectives ?? [], grades, semester };
  });

const objectiveSchema = z.object({
  assignment_id: assignmentId,
  id: z.string().uuid().optional(),
  kode_tp: z.string().trim().min(1).max(30),
  deskripsi: z.string().trim().min(1).max(2000),
  model_penilaian: modelType,
  komponen_type: objectiveType.default("tp"),
  bobot: z.number().int().min(0).max(100).default(0),
  tanggal_rencana_penilaian: z.string().nullable().optional(),
});

export const saveNilaiObjective = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => objectiveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    await requireAssignment(s, context.userId, data.assignment_id);
    const semester = await activeSemester(s);
    const payload = {
      rombel_mata_pelajaran_id: data.assignment_id,
      kode_tp: data.kode_tp,
      deskripsi: data.deskripsi,
      model_penilaian: data.model_penilaian,
      komponen_type: data.komponen_type,
      bobot: data.bobot,
      tanggal_rencana_penilaian: data.tanggal_rencana_penilaian || null,
      semester_id: semester.id,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await s.from("tujuan_pembelajaran").update(payload).eq("id", data.id).eq("rombel_mata_pelajaran_id", data.assignment_id);
      if (error) throw new Error(error.message);
    } else {
      const { data: last } = await s.from("tujuan_pembelajaran").select("urutan").eq("rombel_mata_pelajaran_id", data.assignment_id).order("urutan", { ascending: false }).limit(1).maybeSingle();
      const { error } = await s.from("tujuan_pembelajaran").insert({ ...payload, urutan: Number((last as any)?.urutan ?? 0) + 1, created_by: context.userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteNilaiObjective = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assignment_id: assignmentId, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    await requireAssignment(s, context.userId, data.assignment_id);
    const { error: gradeError } = await s.from("nilai_siswa").delete().eq("tujuan_pembelajaran_id", data.id);
    if (gradeError) throw new Error(gradeError.message);
    const { error } = await s.from("tujuan_pembelajaran").delete().eq("id", data.id).eq("rombel_mata_pelajaran_id", data.assignment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setSikapEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assignment_id: assignmentId, enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    await requireAssignment(s, context.userId, data.assignment_id);
    const semester = await activeSemester(s);
    const { data: existing } = await s.from("tujuan_pembelajaran").select("id").eq("rombel_mata_pelajaran_id", data.assignment_id).or(`semester_id.eq.${semester.id},semester_id.is.null`).eq("komponen_type", "sikap").limit(1).maybeSingle();
    if (existing) {
      const { error } = await s.from("tujuan_pembelajaran").update({ is_active: data.enabled, updated_at: new Date().toISOString() }).eq("id", (existing as any).id);
      if (error) throw new Error(error.message);
    } else if (data.enabled) {
      const { error } = await s.from("tujuan_pembelajaran").insert({ rombel_mata_pelajaran_id: data.assignment_id, kode_tp: "SIKAP", deskripsi: "Komponen Penilaian Sikap", model_penilaian: "observasi", komponen_type: "sikap", bobot: 0, urutan: 999, is_active: true, semester_id: semester.id, created_by: context.userId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveNilaiWeights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assignment_id: assignmentId, weights: z.array(z.object({ id: z.string().uuid(), bobot: z.number().int().min(0).max(100) })).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    await requireAssignment(s, context.userId, data.assignment_id);
    for (const item of data.weights) {
      const { error } = await s.from("tujuan_pembelajaran").update({ bobot: item.bobot, updated_at: new Date().toISOString() }).eq("id", item.id).eq("rombel_mata_pelajaran_id", data.assignment_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveStudentGrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assignment_id: assignmentId, grades: z.array(z.object({ objective_id: z.string().uuid(), student_id: z.string().uuid(), nilai: z.number().min(0).max(100).nullable() })).max(10000) }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    await requireAssignment(s, context.userId, data.assignment_id);
    const semester = await activeSemester(s);
    const objectiveIds = [...new Set(data.grades.map((g) => g.objective_id))];
    const { data: allowed } = await s.from("tujuan_pembelajaran").select("id").eq("rombel_mata_pelajaran_id", data.assignment_id).in("id", objectiveIds);
    const allowedIds = new Set((allowed ?? []).map((x: any) => x.id));
    if (allowedIds.size !== objectiveIds.length) throw new Error("Komponen nilai tidak valid");
    for (const grade of data.grades) {
      const { data: existing, error: lookupError } = await s.from("nilai_siswa").select("id").eq("tujuan_pembelajaran_id", grade.objective_id).eq("student_id", grade.student_id).or(`semester_id.eq.${semester.id},semester_id.is.null`).limit(1).maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (grade.nilai === null) {
        if (existing) {
          const { error } = await s.from("nilai_siswa").delete().eq("id", (existing as any).id);
          if (error) throw new Error(error.message);
        }
      } else if (existing) {
        const { error } = await s.from("nilai_siswa").update({ nilai: grade.nilai, updated_at: new Date().toISOString() }).eq("id", (existing as any).id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await s.from("nilai_siswa").insert({ tujuan_pembelajaran_id: grade.objective_id, student_id: grade.student_id, nilai: grade.nilai, semester_id: semester.id, created_by: context.userId });
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true, saved: data.grades.length };
  });

export const copyNilaiObjectives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ source_assignment_id: assignmentId, target_assignment_id: assignmentId }).refine((x) => x.source_assignment_id !== x.target_assignment_id, "Sumber dan tujuan harus berbeda").parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    await requireAssignment(s, context.userId, data.target_assignment_id);
    const semester = await activeSemester(s);
    const { data: source, error } = await s.from("tujuan_pembelajaran").select("kode_tp, deskripsi, model_penilaian, urutan, is_active, komponen_type, bobot, tanggal_rencana_penilaian").eq("rombel_mata_pelajaran_id", data.source_assignment_id).or(`semester_id.eq.${semester.id},semester_id.is.null`).neq("komponen_type", "sikap").order("urutan");
    if (error) throw new Error(error.message);
    if (!source?.length) throw new Error("Rombel sumber belum memiliki komponen penilaian");
    const rows = source.map((x: any) => ({ ...x, rombel_mata_pelajaran_id: data.target_assignment_id, semester_id: semester.id, created_by: context.userId }));
    const { error: insertError } = await s.from("tujuan_pembelajaran").insert(rows);
    if (insertError) throw new Error(insertError.message);
    return { ok: true, copied: rows.length };
  });
