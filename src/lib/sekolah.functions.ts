import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();
const nullableStr = z.string().trim().min(1).max(255).optional().nullable();

// ============ ROMBEL ============
export const listRombel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ khusus: z.boolean().optional() }).parse)
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("rombel").select("*").order("tingkat").order("name");
    if (data.khusus === true) q = q.eq("is_khusus", true);
    if (data.khusus === false) q = q.or("is_khusus.is.null,is_khusus.eq.false");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const RombelInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(100),
  tingkat: z.string().trim().max(20).optional().nullable(),
  konsentrasi_keahlian: z.string().trim().max(100).optional().nullable(),
  wali_kelas_name: z.string().trim().max(100).optional().nullable(),
  wali_kelas_nip: z.string().trim().max(50).optional().nullable(),
  is_khusus: z.boolean().optional(),
});

export const saveRombel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(RombelInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("rombel").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("rombel").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteRombel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("rombel").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllRombel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ khusus: z.boolean().optional() }).parse)
  .handler(async ({ context, data }) => {
    const { data: rows, error: selErr } = await context.supabase
      .from("rombel")
      .select("id, is_khusus");
    if (selErr) throw new Error(selErr.message);
    const ids = (rows ?? [])
      .filter((r: any) =>
        data.khusus === true ? r.is_khusus === true
        : data.khusus === false ? !r.is_khusus
        : true,
      )
      .map((r: any) => r.id);
    if (!ids.length) return { ok: true, count: 0 };
    const { error } = await context.supabase.from("rombel").delete().in("id", ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: ids.length };
  });

// ============ KONSENTRASI KEAHLIAN ============
export const listKonsentrasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("konsentrasi_keahlian")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const KonsentrasiInput = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
});

export const saveKonsentrasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(KonsentrasiInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    const r = id
      ? await context.supabase.from("konsentrasi_keahlian").update(payload).eq("id", id)
      : await context.supabase.from("konsentrasi_keahlian").insert(payload);
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const deleteKonsentrasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("konsentrasi_keahlian").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ MATA PELAJARAN ============
export const listMapel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mata_pelajaran")
      .select("*")
      .order("kelompok")
      .order("nama");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const MapelInput = z.object({
  id: uuid.optional(),
  nama: z.string().trim().min(1).max(150),
  kode: z.string().trim().max(20).optional().nullable(),
  kelompok: z.string().trim().max(50).optional().nullable(),
});

export const saveMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(MapelInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    const r = id
      ? await context.supabase.from("mata_pelajaran").update(payload).eq("id", id)
      : await context.supabase.from("mata_pelajaran").insert(payload);
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const deleteMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("mata_pelajaran").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MapelImportInput = z.object({
  rows: z.array(
    z.object({
      nama: z.string().trim().min(1).max(150),
      kode: z.string().trim().max(20).optional().nullable(),
      kelompok: z.string().trim().max(50).optional().nullable(),
    }),
  ).min(1).max(1000),
  mode: z.enum(["append", "replace"]).default("append"),
});

export const importMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(MapelImportInput.parse)
  .handler(async ({ context, data }) => {
    if (data.mode === "replace") {
      const { error: delErr } = await context.supabase
        .from("mata_pelajaran")
        .delete()
        .not("id", "is", null);
      if (delErr) throw new Error(delErr.message);
    }
    const payload = data.rows.map((r) => ({
      nama: r.nama,
      kode: r.kode || null,
      kelompok: r.kelompok || null,
    }));
    const { error } = await context.supabase.from("mata_pelajaran").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, count: payload.length };
  });

// ============ GURU ============
export const listGuru = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("guru")
      .select("*")
      .order("nama");
    if (error) throw new Error(error.message);
    const mids = [...new Set((rows ?? []).map((r) => r.mata_pelajaran_id).filter(Boolean) as string[])];
    const mapelMap = new Map<string, string>();
    if (mids.length) {
      const { data: m } = await context.supabase
        .from("mata_pelajaran")
        .select("id, nama")
        .in("id", mids);
      (m ?? []).forEach((x: any) => mapelMap.set(x.id, x.nama));
    }
    return (rows ?? []).map((r) => ({
      ...r,
      mapel_nama: r.mata_pelajaran_id ? mapelMap.get(r.mata_pelajaran_id) ?? "—" : "—",
    }));
  });

const GuruInput = z.object({
  id: uuid.optional(),
  nama: z.string().trim().min(1).max(150),
  nip: z.string().trim().max(30).optional().nullable(),
  jenis_kelamin: z.enum(["L", "P"]).optional().nullable(),
  mata_pelajaran_id: uuid.optional().nullable(),
  kelompok_mapel: z.string().trim().max(50).optional().nullable(),
  kualifikasi_pendidikan: z.string().trim().max(50).optional().nullable(),
  no_whatsapp: z.string().trim().max(20).optional().nullable(),
});

export const saveGuru = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(GuruInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    const r = id
      ? await context.supabase.from("guru").update(payload).eq("id", id)
      : await context.supabase.from("guru").insert(payload);
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const deleteGuru = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("guru").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PERIODE (Tahun Ajaran + Semester) ============
export const listPeriode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [tahun, semester] = await Promise.all([
      context.supabase.from("tahun_ajaran").select("*").order("tanggal_mulai", { ascending: false }),
      context.supabase.from("semester").select("*").order("tanggal_mulai", { ascending: false }),
    ]);
    if (tahun.error) throw new Error(tahun.error.message);
    if (semester.error) throw new Error(semester.error.message);
    return { tahun: tahun.data ?? [], semester: semester.data ?? [] };
  });

const TahunInput = z.object({
  id: uuid.optional(),
  nama: z.string().trim().min(1).max(50),
  tanggal_mulai: z.string().optional().nullable(),
  tanggal_selesai: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const saveTahunAjaran = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(TahunInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    if (payload.is_active) {
      await context.supabase.from("tahun_ajaran").update({ is_active: false }).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    }
    const r = id
      ? await context.supabase.from("tahun_ajaran").update(payload).eq("id", id)
      : await context.supabase.from("tahun_ajaran").insert(payload);
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const deleteTahunAjaran = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("tahun_ajaran").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SemesterInput = z.object({
  id: uuid.optional(),
  tahun_ajaran_id: uuid,
  nama: z.string().trim().min(1).max(50),
  tanggal_mulai: z.string().optional().nullable(),
  tanggal_selesai: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const saveSemester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(SemesterInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    if (payload.is_active) {
      await context.supabase.from("semester").update({ is_active: false }).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    }
    const r = id
      ? await context.supabase.from("semester").update(payload).eq("id", id)
      : await context.supabase.from("semester").insert(payload);
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const deleteSemester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("semester").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setActiveTahun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const off = await context.supabase.from("tahun_ajaran").update({ is_active: false }).neq("id", data.id);
    if (off.error) throw new Error(off.error.message);
    const on = await context.supabase.from("tahun_ajaran").update({ is_active: true }).eq("id", data.id);
    if (on.error) throw new Error(on.error.message);
    return { ok: true };
  });

export const setActiveSemester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const off = await context.supabase.from("semester").update({ is_active: false }).neq("id", data.id);
    if (off.error) throw new Error(off.error.message);
    const on = await context.supabase.from("semester").update({ is_active: true }).eq("id", data.id);
    if (on.error) throw new Error(on.error.message);
    return { ok: true };
  });

// ============ DENAH (sarpras_ruang + jenis_ruang) ============
export const listDenah = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [ruang, jenis, rombel] = await Promise.all([
      context.supabase.from("sarpras_ruang").select("*").order("nama"),
      context.supabase.from("sarpras_jenis_ruang").select("*").order("nama"),
      context.supabase.from("rombel").select("id, name").order("name"),
    ]);
    if (ruang.error) throw new Error(ruang.error.message);
    if (jenis.error) throw new Error(jenis.error.message);
    if (rombel.error) throw new Error(rombel.error.message);
    const jMap = new Map((jenis.data ?? []).map((x: any) => [x.id, x.nama]));
    const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));
    return {
      ruang: (ruang.data ?? []).map((r: any) => ({
        ...r,
        jenis_nama: r.jenis_ruang_id ? jMap.get(r.jenis_ruang_id) ?? "—" : "—",
        rombel_nama: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
      })),
      jenis: jenis.data ?? [],
      rombel: rombel.data ?? [],
    };
  });

const RuangInput = z.object({
  id: uuid.optional(),
  nama: z.string().trim().min(1).max(100),
  kode_ruang: z.string().trim().max(30).optional().nullable(),
  kapasitas: z.number().int().min(0).max(1000).optional().nullable(),
  jenis_ruang_id: uuid.optional().nullable(),
  rombel_id: uuid.optional().nullable(),
  denah_posisi_x: z.number().optional().nullable(),
  denah_posisi_y: z.number().optional().nullable(),
});

export const saveRuang = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(RuangInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    const r = id
      ? await context.supabase.from("sarpras_ruang").update(payload).eq("id", id)
      : await context.supabase.from("sarpras_ruang").insert({ ...payload, created_by: context.userId });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const deleteRuang = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sarpras_ruang").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const JenisInput = z.object({
  id: uuid.optional(),
  nama: z.string().trim().min(1).max(100),
  keterangan: z.string().trim().max(255).optional().nullable(),
  is_kelas: z.boolean().optional(),
});

export const saveJenisRuang = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(JenisInput.parse)
  .handler(async ({ context, data }) => {
    const { id, ...payload } = data;
    const r = id
      ? await context.supabase.from("sarpras_jenis_ruang").update(payload).eq("id", id)
      : await context.supabase.from("sarpras_jenis_ruang").insert({ ...payload, created_by: context.userId });
    if (r.error) throw new Error(r.error.message);
    return { ok: true };
  });

export const deleteJenisRuang = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: uuid }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sarpras_jenis_ruang").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
