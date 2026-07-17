import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAllowedRombelIds } from "@/lib/rombel-access";
import { z } from "zod";


const SETTING_DEADLINE = "berkas_pembelajaran_deadline";

type Ket = "belum" | "menunggu" | "valid" | "perbaikan";

const DOC_FIELDS = [
  "analisis_cp_atp_link",
  "prota_link",
  "promes_link",
  "rpa_link",
  "modul_ajar_link",
] as const;

function computeKet(row: any): Ket {
  if (!row) return "belum";
  if (row.status === "disetujui") return "valid";
  if (row.status === "perbaikan") return "perbaikan";
  return "menunggu";
}
function fillCount(row: any): number {
  if (!row) return 0;
  return DOC_FIELDS.filter((k) => typeof row[k] === "string" && row[k].trim().length > 0).length;
}

export const getAdministrasiRefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase;
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      s.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      s.rpc("has_role", { _user_id: context.userId, _role: "superadmin" }),
    ]);
    const privileged = Boolean(isAdmin) || Boolean(isSuper);

    // Determine own guru row for non-privileged users
    let ownGuruId: string | null = null;
    if (!privileged) {
      const { data: prof } = await s.from("profiles").select("nip").eq("id", context.userId).maybeSingle();
      const nip = (prof as any)?.nip?.trim();
      if (nip) {
        const { data: g } = await s.from("guru").select("id").eq("nip", nip).maybeSingle();
        ownGuruId = (g as any)?.id ?? null;
      }
    }

    // Restrict rombel list: privileged sees all; guru sees only rombels they teach;
    // non-privileged non-guru falls back to Akses Rombel.
    let rombelIds: string[] | null = null;
    if (!privileged) {
      if (ownGuruId) {
        const { data: rmpRows } = await s
          .from("rombel_mata_pelajaran")
          .select("rombel_id")
          .eq("guru_id", ownGuruId)
          .is("deleted_at", null);
        rombelIds = Array.from(new Set((rmpRows ?? []).map((r: any) => r.rombel_id).filter(Boolean))) as string[];
      } else {
        rombelIds = await getAllowedRombelIds(s, context.userId);
      }
    }

    let rombelQ = s.from("rombel").select("id, name").order("name");
    if (rombelIds !== null) {
      if (rombelIds.length === 0) {
        const [{ data: mapel }, { data: guru }, { data: setting }] = await Promise.all([
          s.from("mata_pelajaran").select("id, nama").order("nama"),
          s.from("guru").select("id, nama, nip").order("nama"),
          s.from("app_settings").select("value").eq("key", SETTING_DEADLINE).maybeSingle(),
        ]);
        return { rombel: [], mapel: mapel ?? [], guru: guru ?? [], deadline: (setting as any)?.value ?? "" };
      }
      rombelQ = rombelQ.in("id", rombelIds);
    }
    const [{ data: rombel }, { data: mapel }, { data: guru }, { data: setting }] = await Promise.all([
      rombelQ,
      s.from("mata_pelajaran").select("id, nama").order("nama"),
      s.from("guru").select("id, nama, nip").order("nama"),
      s.from("app_settings").select("value").eq("key", SETTING_DEADLINE).maybeSingle(),
    ]);
    return {
      rombel: rombel ?? [],
      mapel: mapel ?? [],
      guru: guru ?? [],
      deadline: (setting as any)?.value ?? "",
    };
  });

export const listAdministrasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    rombel_id: z.string().optional(),
    mapel_id: z.string().optional(),
    guru_id: z.string().optional(),
    keterangan: z.enum(["all", "belum", "menunggu", "valid", "perbaikan"]).optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    sort: z.enum([
      "no_asc", "no_desc",
      "rombel_asc", "rombel_desc",
      "mapel_asc", "mapel_desc",
      "guru_asc", "guru_desc",
      "kelengkapan_asc", "kelengkapan_desc",
      "keterangan_asc", "keterangan_desc",
    ]).optional(),
  }).optional().parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;

    // Restrict to own guru row unless admin/superadmin
    const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
      s.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      s.rpc("has_role", { _user_id: context.userId, _role: "superadmin" }),
    ]);
    const privileged = Boolean(isAdmin) || Boolean(isSuper);

    let ownGuruId: string | null = null;
    if (!privileged) {
      const { data: prof } = await s.from("profiles").select("nip").eq("id", context.userId).maybeSingle();
      const nip = (prof as any)?.nip?.trim();
      if (nip) {
        const { data: g } = await s.from("guru").select("id").eq("nip", nip).maybeSingle();
        ownGuruId = (g as any)?.id ?? null;
      }
      if (!ownGuruId) {
        return { rows: [], total: 0, page: 1, pageSize: data?.pageSize ?? 20, stats: { total: 0, sudah_input: 0, belum_input: 0, valid: 0, lengkap_100: 0, menunggu: 0, perbaikan: 0, parsial: 0 } };
      }
    }

    // Akses Rombel restriction applies to privileged-but-scoped admins (none here)
    // and to non-privileged non-guru users. A non-privileged guru always sees
    // their own teaching assignments regardless of Akses Rombel.
    const allowed = privileged ? null : (ownGuruId ? null : await getAllowedRombelIds(s, context.userId));
    if (allowed !== null && allowed.length === 0) {
      return { rows: [], total: 0, page: 1, pageSize: data?.pageSize ?? 20, stats: { total: 0, sudah_input: 0, belum_input: 0, valid: 0, lengkap_100: 0, menunggu: 0, perbaikan: 0, parsial: 0 } };
    }

    let baseQ = s
      .from("rombel_mata_pelajaran")
      .select("id, rombel_id, mata_pelajaran_id, guru_id")
      .is("deleted_at", null);
    if (allowed !== null) baseQ = baseQ.in("rombel_id", allowed);
    if (data?.rombel_id && data.rombel_id !== "all") baseQ = baseQ.eq("rombel_id", data.rombel_id);
    if (data?.mapel_id && data.mapel_id !== "all") baseQ = baseQ.eq("mata_pelajaran_id", data.mapel_id);
    if (privileged) {
      if (data?.guru_id && data.guru_id !== "all") baseQ = baseQ.eq("guru_id", data.guru_id);
    } else {
      baseQ = baseQ.eq("guru_id", ownGuruId!);
    }
    const { data: assignments, error } = await baseQ;
    if (error) throw new Error(error.message);

    const ids = (assignments ?? []).map((a: any) => a.id);
    const rIds = [...new Set((assignments ?? []).map((a: any) => a.rombel_id).filter(Boolean))];
    const mIds = [...new Set((assignments ?? []).map((a: any) => a.mata_pelajaran_id).filter(Boolean))];
    const gIds = [...new Set((assignments ?? []).map((a: any) => a.guru_id).filter(Boolean))];

    const [rombelRes, mapelRes, guruRes, berkasRes] = await Promise.all([
      rIds.length ? s.from("rombel").select("id, name").in("id", rIds) : Promise.resolve({ data: [] as any[], error: null }),
      mIds.length ? s.from("mata_pelajaran").select("id, nama").in("id", mIds) : Promise.resolve({ data: [] as any[], error: null }),
      gIds.length ? s.from("guru").select("id, nama, nip").in("id", gIds) : Promise.resolve({ data: [] as any[], error: null }),
      ids.length ? s.from("berkas_pembelajaran")
        .select("id, rombel_mata_pelajaran_id, analisis_cp_atp_link, prota_link, promes_link, rpa_link, modul_ajar_link, status, catatan_perbaikan, diperiksa_oleh_nama, diperiksa_at")
        .not("rombel_mata_pelajaran_id", "is", null)
        .limit(10000) : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    if ((rombelRes as any).error) throw new Error((rombelRes as any).error.message);
    if ((mapelRes as any).error) throw new Error((mapelRes as any).error.message);
    if ((guruRes as any).error) throw new Error((guruRes as any).error.message);
    if ((berkasRes as any).error) throw new Error((berkasRes as any).error.message);

    const rombelMap = new Map((rombelRes.data ?? []).map((x: any) => [x.id, x]));
    const mapelMap = new Map((mapelRes.data ?? []).map((x: any) => [x.id, x]));
    const guruMap = new Map((guruRes.data ?? []).map((x: any) => [x.id, x]));
    const berkasMap = new Map<string, any>();
    for (const b of berkasRes.data ?? []) {
      const k = (b as any).rombel_mata_pelajaran_id;
      if (!berkasMap.has(k)) berkasMap.set(k, b);
    }

    let merged = (assignments ?? []).map((a: any) => {
      const b = berkasMap.get(a.id) ?? null;
      const r = rombelMap.get(a.rombel_id) as any;
      const m = mapelMap.get(a.mata_pelajaran_id) as any;
      const g = guruMap.get(a.guru_id) as any;
      const filled = fillCount(b);
      const ket = computeKet(b);
      return {
        id: a.id,
        berkas_id: b?.id ?? null,
        rombel_name: r?.name ?? "—",
        mapel_nama: m?.nama ?? "—",
        guru_nama: g?.nama ?? "—",
        guru_nip: g?.nip ?? null,
        analisis_cp_atp_link: b?.analisis_cp_atp_link ?? null,
        prota_link: b?.prota_link ?? null,
        promes_link: b?.promes_link ?? null,
        rpa_link: b?.rpa_link ?? null,
        modul_ajar_link: b?.modul_ajar_link ?? null,
        kelengkapan: Math.round((filled / DOC_FIELDS.length) * 100),
        keterangan: ket as Ket,
        catatan_perbaikan: b?.catatan_perbaikan ?? null,
        diperiksa_oleh_nama: b?.diperiksa_oleh_nama ?? null,
        diperiksa_at: b?.diperiksa_at ?? null,
      };
    });

    const stats = {
      total: merged.length,
      sudah_input: merged.filter((r) => r.berkas_id).length,
      belum_input: merged.filter((r) => !r.berkas_id).length,
      valid: merged.filter((r) => r.keterangan === "valid").length,
      lengkap_100: merged.filter((r) => r.kelengkapan === 100).length,
      menunggu: merged.filter((r) => r.keterangan === "menunggu").length,
      perbaikan: merged.filter((r) => r.keterangan === "perbaikan").length,
      parsial: merged.filter((r) => r.berkas_id && r.kelengkapan > 0 && r.kelengkapan < 100).length,
    };

    if (data?.keterangan && data.keterangan !== "all") {
      merged = merged.filter((r) => r.keterangan === data.keterangan);
    }

    const sort = data?.sort ?? "rombel_asc";
    const dir = sort.endsWith("_desc") ? -1 : 1;
    const key = sort.replace(/_(asc|desc)$/, "");
    const ketOrder: Record<Ket, number> = { valid: 0, menunggu: 1, perbaikan: 2, belum: 3 };
    merged.sort((a, b) => {
      switch (key) {
        case "rombel": return dir * a.rombel_name.localeCompare(b.rombel_name);
        case "mapel": return dir * a.mapel_nama.localeCompare(b.mapel_nama);
        case "guru": return dir * a.guru_nama.localeCompare(b.guru_nama);
        case "kelengkapan": return dir * (a.kelengkapan - b.kelengkapan);
        case "keterangan": return dir * (ketOrder[a.keterangan] - ketOrder[b.keterangan]);
        default: return 0;
      }
    });

    const total = merged.length;
    const page = Math.max(1, data?.page ?? 1);
    const pageSize = Math.max(5, Math.min(200, data?.pageSize ?? 20));
    const start = (page - 1) * pageSize;
    const rows = merged.slice(start, start + pageSize);

    return { rows, total, page, pageSize, stats };
  });

const linkOrEmpty = z.string().trim().optional().or(z.literal(""));

export const upsertAdministrasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    rombel_mata_pelajaran_id: z.string().uuid(),
    analisis_cp_atp_link: linkOrEmpty,
    prota_link: linkOrEmpty,
    promes_link: linkOrEmpty,
    rpa_link: linkOrEmpty,
    modul_ajar_link: linkOrEmpty,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const { data: rmp, error: rmpErr } = await s
      .from("rombel_mata_pelajaran")
      .select("guru_id")
      .eq("id", data.rombel_mata_pelajaran_id)
      .maybeSingle();
    if (rmpErr) throw new Error(rmpErr.message);
    if (!rmp) throw new Error("Assignment tidak ditemukan");

    const payload: any = {
      rombel_mata_pelajaran_id: data.rombel_mata_pelajaran_id,
      guru_id: (rmp as any).guru_id,
      analisis_cp_atp_link: data.analisis_cp_atp_link || null,
      prota_link: data.prota_link || null,
      promes_link: data.promes_link || null,
      rpa_link: data.rpa_link || null,
      modul_ajar_link: data.modul_ajar_link || null,
      status: "menunggu",
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await s
      .from("berkas_pembelajaran")
      .select("id")
      .eq("rombel_mata_pelajaran_id", data.rombel_mata_pelajaran_id)
      .maybeSingle();

    if (existing) {
      const { error } = await s.from("berkas_pembelajaran").update(payload).eq("id", (existing as any).id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await s.from("berkas_pembelajaran").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Create a short-lived signed URL for a storage object path. */
export const getBerkasSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase
      .storage.from("berkas-pembelajaran")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? "" };
  });
