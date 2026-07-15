import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SETTING_DEADLINE = "berkas_pembelajaran_deadline";
const SETTING_KBM_QR = "kbm_qr_validation_enabled";

// ============ Settings ============

export const getPembelajaranSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [SETTING_DEADLINE, SETTING_KBM_QR]);
    if (error) throw new Error(error.message);
    const map: Record<string, string> = {};
    for (const r of data ?? []) map[(r as any).key] = (r as any).value;
    return {
      deadline: map[SETTING_DEADLINE] ?? "",
      kbm_qr_enabled: map[SETTING_KBM_QR] === "true",
    };
  });

async function upsertSetting(supabase: any, key: string, value: string) {
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("app_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("id", (existing as any).id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("app_settings")
      .insert({ key, value });
    if (error) throw new Error(error.message);
  }
}

export const saveDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deadline: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await upsertSetting(context.supabase, SETTING_DEADLINE, data.deadline);
    return { ok: true };
  });

export const setKbmQrValidation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await upsertSetting(context.supabase, SETTING_KBM_QR, data.enabled ? "true" : "false");
    return { ok: true };
  });

// ============ References for dropdowns ============

export const listPembelajaranRefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rombel }, { data: mapel }, { data: guru }] = await Promise.all([
      context.supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian").order("name"),
      context.supabase.from("mata_pelajaran").select("id, nama, kelompok, kode").order("nama"),
      context.supabase.from("guru").select("id, nama, nip").order("nama"),
    ]);
    return {
      rombel: rombel ?? [],
      mapel: mapel ?? [],
      guru: guru ?? [],
    };
  });

// ============ Rombel Mata Pelajaran CRUD ============

export const listRombelMapel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    rombel_id: z.string().optional(),
    mapel_id: z.string().optional(),
    guru_id: z.string().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    trashed: z.boolean().optional(),
    sort: z.enum([
      "no_asc", "no_desc",
      "rombel_asc", "rombel_desc",
      "kelompok_asc", "kelompok_desc",
      "mapel_asc", "mapel_desc",
      "guru_asc", "guru_desc",
    ]).optional(),
  }).optional().parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    let q = context.supabase
      .from("rombel_mata_pelajaran")
      .select(
        "id, rombel_id, mata_pelajaran_id, guru_id, created_at, deleted_at",
        { count: "exact" },
      );

    if (data?.trashed) q = q.not("deleted_at", "is", null);
    else q = q.is("deleted_at", null);
    if (data?.rombel_id && data.rombel_id !== "all") q = q.eq("rombel_id", data.rombel_id);
    if (data?.mapel_id && data.mapel_id !== "all") q = q.eq("mata_pelajaran_id", data.mapel_id);
    if (data?.guru_id && data.guru_id !== "all") q = q.eq("guru_id", data.guru_id);

    const page = Math.max(1, data?.page ?? 1);
    const pageSize = Math.max(5, Math.min(200, data?.pageSize ?? 20));
    const start = (page - 1) * pageSize;
    q = q.order("created_at", { ascending: false }).range(start, start + pageSize - 1);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const rIds = [...new Set((rows ?? []).map((r: any) => r.rombel_id).filter(Boolean))];
    const mIds = [...new Set((rows ?? []).map((r: any) => r.mata_pelajaran_id).filter(Boolean))];
    const gIds = [...new Set((rows ?? []).map((r: any) => r.guru_id).filter(Boolean))];

    const [rombelRes, mapelRes, guruRes] = await Promise.all([
      rIds.length ? s.from("rombel").select("id, name").in("id", rIds) : Promise.resolve({ data: [] as any[], error: null }),
      mIds.length ? s.from("mata_pelajaran").select("id, nama, kelompok").in("id", mIds) : Promise.resolve({ data: [] as any[], error: null }),
      gIds.length ? s.from("guru").select("id, nama, nip").in("id", gIds) : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    if ((rombelRes as any).error) throw new Error((rombelRes as any).error.message);
    if ((mapelRes as any).error) throw new Error((mapelRes as any).error.message);
    if ((guruRes as any).error) throw new Error((guruRes as any).error.message);

    const rombelMap = new Map((rombelRes.data ?? []).map((x: any) => [x.id, x]));
    const mapelMap = new Map((mapelRes.data ?? []).map((x: any) => [x.id, x]));
    const guruMap = new Map((guruRes.data ?? []).map((x: any) => [x.id, x]));

    let mapped = (rows ?? []).map((r: any) => ({
      id: r.id,
      rombel_id: r.rombel_id,
      mata_pelajaran_id: r.mata_pelajaran_id,
      guru_id: r.guru_id,
      created_at: r.created_at,
      deleted_at: r.deleted_at,
      rombel_name: (rombelMap.get(r.rombel_id) as any)?.name ?? "—",
      mapel_nama: (mapelMap.get(r.mata_pelajaran_id) as any)?.nama ?? "—",
      mapel_kelompok: (mapelMap.get(r.mata_pelajaran_id) as any)?.kelompok ?? "—",
      guru_nama: (guruMap.get(r.guru_id) as any)?.nama ?? "—",
      guru_nip: (guruMap.get(r.guru_id) as any)?.nip ?? null,
    }));

    // Client-side sort for joined columns (Postgres sort on joined table via order isn't as clean)
    const sort = data?.sort ?? "no_asc";
    const cmp = (a: any, b: any) => {
      const dir = sort.endsWith("_desc") ? -1 : 1;
      const key = sort.replace(/_(asc|desc)$/, "");
      switch (key) {
        case "rombel": return dir * a.rombel_name.localeCompare(b.rombel_name);
        case "kelompok": return dir * a.mapel_kelompok.localeCompare(b.mapel_kelompok);
        case "mapel": return dir * a.mapel_nama.localeCompare(b.mapel_nama);
        case "guru": return dir * a.guru_nama.localeCompare(b.guru_nama);
        default: return 0;
      }
    };
    if (sort !== "no_asc" && sort !== "no_desc") mapped.sort(cmp);

    return { rows: mapped, total: count ?? 0, page, pageSize };
  });

export const createRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    rombel_id: z.string().uuid(),
    mata_pelajaran_id: z.string().uuid(),
    guru_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("rombel_mata_pelajaran").insert({
      rombel_id: data.rombel_id,
      mata_pelajaran_id: data.mata_pelajaran_id,
      guru_id: data.guru_id,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    rombel_id: z.string().uuid().optional(),
    mata_pelajaran_id: z.string().uuid().optional(),
    guru_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: {
      rombel_id?: string;
      mata_pelajaran_id?: string;
      guru_id?: string;
    } = {};
    if (data.rombel_id) patch.rombel_id = data.rombel_id;
    if (data.mata_pelajaran_id) patch.mata_pelajaran_id = data.mata_pelajaran_id;
    if (data.guru_id) patch.guru_id = data.guru_id;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("rombel_mata_pelajaran")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkUpdateRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(2000),
    rombel_id: z.string().uuid().optional(),
    mata_pelajaran_id: z.string().uuid().optional(),
    guru_id: z.string().uuid().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: {
      rombel_id?: string;
      mata_pelajaran_id?: string;
      guru_id?: string;
    } = {};
    if (data.rombel_id) patch.rombel_id = data.rombel_id;
    if (data.mata_pelajaran_id) patch.mata_pelajaran_id = data.mata_pelajaran_id;
    if (data.guru_id) patch.guru_id = data.guru_id;
    if (Object.keys(patch).length === 0) return { ok: true, affected: 0 };
    const { error, count } = await context.supabase
      .from("rombel_mata_pelajaran")
      .update(patch, { count: "exact" })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, affected: count ?? 0 };
  });

export const softDeleteRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rombel_mata_pelajaran")
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rombel_mata_pelajaran")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const purgeRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("rombel_mata_pelajaran")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const softDeleteAllRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error, count } = await context.supabase
      .from("rombel_mata_pelajaran")
      .update({ deleted_at: new Date().toISOString(), deleted_by: context.userId }, { count: "exact" })
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    return { ok: true, affected: count ?? 0 };
  });

// ============ Bulk Import ============

export const bulkImportRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    rows: z.array(z.object({
      rombel: z.string().min(1),
      mapel: z.string().min(1),
      guru: z.string().min(1),
    })).min(1).max(2000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: rombelList }, { data: mapelList }, { data: guruList }] = await Promise.all([
      context.supabase.from("rombel").select("id, name"),
      context.supabase.from("mata_pelajaran").select("id, nama, kode"),
      context.supabase.from("guru").select("id, nama, nip"),
    ]);
    const norm = (s: string) => (s ?? "").trim().toLowerCase();
    const rombelMap = new Map((rombelList ?? []).map((r: any) => [norm(r.name), r.id]));
    const mapelMap = new Map<string, string>();
    for (const m of mapelList ?? []) {
      mapelMap.set(norm((m as any).nama), (m as any).id);
      if ((m as any).kode) mapelMap.set(norm((m as any).kode), (m as any).id);
    }
    const guruMap = new Map<string, string>();
    for (const g of guruList ?? []) {
      guruMap.set(norm((g as any).nama), (g as any).id);
      if ((g as any).nip) guruMap.set(norm((g as any).nip), (g as any).id);
    }

    const errors: { row: number; message: string }[] = [];
    const toInsert: any[] = [];
    data.rows.forEach((r, i) => {
      const line = i + 2;
      const rid = rombelMap.get(norm(r.rombel));
      const mid = mapelMap.get(norm(r.mapel));
      const gid = guruMap.get(norm(r.guru));
      if (!rid) return errors.push({ row: line, message: `Rombel "${r.rombel}" tidak ditemukan` });
      if (!mid) return errors.push({ row: line, message: `Mata pelajaran "${r.mapel}" tidak ditemukan` });
      if (!gid) return errors.push({ row: line, message: `Guru "${r.guru}" tidak ditemukan` });
      toInsert.push({ rombel_id: rid, mata_pelajaran_id: mid, guru_id: gid, created_by: context.userId });
    });

    let inserted = 0;
    if (toInsert.length) {
      const { error, count } = await context.supabase
        .from("rombel_mata_pelajaran")
        .insert(toInsert, { count: "exact" });
      if (error) throw new Error(error.message);
      inserted = count ?? toInsert.length;
    }
    return { inserted, failed: errors.length, errors: errors.slice(0, 50) };
  });

export const emptyTrashRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error, count } = await context.supabase
      .from("rombel_mata_pelajaran")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true, affected: count ?? 0 };
  });

