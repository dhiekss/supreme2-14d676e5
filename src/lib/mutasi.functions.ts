import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ helpers ============
async function attachStudentRombel(
  supabase: any,
  rows: any[],
  opts: { studentIdKey?: string; rombelKeys?: string[] } = {},
) {
  const studentIdKey = opts.studentIdKey ?? "student_id";
  const rombelKeys = opts.rombelKeys ?? ["rombel_id"];
  const sIds = [...new Set(rows.map((r) => r[studentIdKey]).filter(Boolean))];
  const rIds = [
    ...new Set(rows.flatMap((r) => rombelKeys.map((k) => r[k])).filter(Boolean)),
  ];
  const [students, rombel] = await Promise.all([
    sIds.length
      ? supabase.from("students").select("id, name, nis").in("id", sIds)
      : Promise.resolve({ data: [] }),
    rIds.length
      ? supabase.from("rombel").select("id, name").in("id", rIds)
      : Promise.resolve({ data: [] }),
  ]);
  const sMap = new Map((students.data ?? []).map((x: any) => [x.id, x]));
  const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x]));
  return rows.map((r) => {
    const out: any = { ...r };
    out.students = sMap.get(r[studentIdKey]) ?? null;
    for (const k of rombelKeys) {
      out[k.replace(/_id$/, "")] = rMap.get(r[k]) ?? null;
    }
    if (rombelKeys.includes("rombel_id")) out.rombel = rMap.get(r.rombel_id) ?? null;
    if (rombelKeys.includes("rombel_asal_id")) out.asal = rMap.get(r.rombel_asal_id) ?? null;
    if (rombelKeys.includes("rombel_tujuan_id")) out.tujuan = rMap.get(r.rombel_tujuan_id) ?? null;
    return out;
  });
}

// ============ ROMBEL TRANSFERS ============
export const listRombelTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("student_rombel_transfers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const enriched = await attachStudentRombel(supabase, rows ?? [], {
      rombelKeys: ["rombel_asal_id", "rombel_tujuan_id"],
    });
    if (!data.search) return enriched;
    const s = data.search.toLowerCase();
    return enriched.filter(
      (r: any) =>
        r.students?.name?.toLowerCase().includes(s) ||
        r.students?.nis?.toLowerCase().includes(s),
    );
  });


export const upsertRombelTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    student_id: string;
    rombel_asal_id?: string;
    rombel_tujuan_id: string;
    tanggal_pindah?: string;
    alasan?: string;
    dapodik_status?: string;
    dapodik_tanggal?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Snapshot murid & rombel supaya riwayat tetap utuh
    const [studentRes, asalRes, tujuanRes] = await Promise.all([
      supabase.from("students").select("name, nis, rombel_id").eq("id", data.student_id).maybeSingle(),
      data.rombel_asal_id
        ? supabase.from("rombel").select("name").eq("id", data.rombel_asal_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.rombel_tujuan_id
        ? supabase.from("rombel").select("name").eq("id", data.rombel_tujuan_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const rombelAsalId = data.rombel_asal_id ?? (studentRes.data as any)?.rombel_id ?? null;
    let rombelAsalName: string | null = (asalRes.data as any)?.name ?? null;
    if (!rombelAsalName && rombelAsalId) {
      const { data: r } = await supabase.from("rombel").select("name").eq("id", rombelAsalId).maybeSingle();
      rombelAsalName = (r as any)?.name ?? null;
    }

    const payload: any = {
      ...data,
      rombel_asal_id: rombelAsalId,
      student_name: (studentRes.data as any)?.name ?? null,
      student_nis: (studentRes.data as any)?.nis ?? null,
      rombel_asal_name: rombelAsalName,
      rombel_tujuan_name: (tujuanRes.data as any)?.name ?? null,
      created_by: userId,
    };
    if (data.id) {
      delete payload.created_by;
      const { error } = await supabase.from("student_rombel_transfers").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      delete payload.id;
      const { error } = await supabase.from("student_rombel_transfers").insert(payload);
      if (error) throw new Error(error.message);
    }
    // Optionally update student's rombel
    if (data.rombel_tujuan_id) {
      await supabase.from("students").update({ rombel_id: data.rombel_tujuan_id }).eq("id", data.student_id);
    }
    return { ok: true };
  });

export const deleteRombelTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_rombel_transfers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ RESIGNATIONS ============
export const listResignations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("student_resignations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`student_name.ilike.${s},student_nis.ilike.${s},alasan.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return attachStudentRombel(supabase, rows ?? []);
  });


export const upsertResignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    student_id?: string;
    rombel_id?: string;
    student_name?: string;
    student_nis?: string;
    tanggal_surat?: string;
    alasan?: string;
    file_surat?: string;
    dapodik_status?: string;
    dapodik_tanggal?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Snapshot murid & rombel dari data induk agar riwayat tetap utuh
    let snap: any = {};
    if (data.student_id) {
      const { data: s } = await supabase
        .from("students")
        .select("name, nis, rombel_id")
        .eq("id", data.student_id)
        .maybeSingle();
      if (s) {
        snap.student_name = data.student_name ?? (s as any).name ?? null;
        snap.student_nis = data.student_nis ?? (s as any).nis ?? null;
        snap.rombel_id = data.rombel_id ?? (s as any).rombel_id ?? null;
      }
    }
    const payload: any = { ...data, ...snap, created_by: userId };
    if (data.id) {
      delete payload.created_by;
      const { error } = await supabase.from("student_resignations").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      delete payload.id;
      const { error } = await supabase.from("student_resignations").insert(payload);
      if (error) throw new Error(error.message);
    }
    if (data.student_id) {
      await supabase.from("students").update({ rombel_id: null }).eq("id", data.student_id);
    }
    return { ok: true };
  });


export const deleteResignation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_resignations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ TRANSFERS OUT (Pindah Sekolah) ============
export const listTransfersOut = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string } = {}) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("student_transfers_out")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`student_name.ilike.${s},student_nis.ilike.${s},sekolah_tujuan.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return attachStudentRombel(supabase, rows ?? []);
  });

export const upsertTransferOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    student_id?: string;
    rombel_id?: string;
    student_name?: string;
    student_nis?: string;
    sekolah_tujuan?: string;
    tanggal_surat_pindah?: string;
    tanggal_diterima_tujuan?: string;
    file_surat?: string;
    dapodik_status?: string;
    dapodik_tanggal?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload: any = { ...data, created_by: userId };
    if (data.id) {
      delete payload.created_by;
      const { error } = await supabase.from("student_transfers_out").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      delete payload.id;
      const { error } = await supabase.from("student_transfers_out").insert(payload);
      if (error) throw new Error(error.message);
    }
    if (data.student_id) {

      await supabase.from("students").update({ rombel_id: null }).eq("id", data.student_id);
    }
    return { ok: true };
  });


export const deleteTransferOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_transfers_out").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ HELPERS ============
export const listStudentsForMutasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("students")
      .select("id, name, nis, rombel_id")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listRombelForMutasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rombel")
      .select("id, name, tingkat")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const mutasiSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ count: rombelCnt }, { count: resignCnt }, { count: outCnt }] = await Promise.all([
      supabase.from("student_rombel_transfers").select("id", { count: "exact", head: true }),
      supabase.from("student_resignations").select("id", { count: "exact", head: true }),
      supabase.from("student_transfers_out").select("id", { count: "exact", head: true }),
    ]);
    return {
      rombel: rombelCnt ?? 0,
      resign: resignCnt ?? 0,
      out: outCnt ?? 0,
    };
  });
