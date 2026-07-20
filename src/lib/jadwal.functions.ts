import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export const listJadwal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid().optional(),
      kelompokId: z.string().uuid().optional(),
      guruId: z.string().uuid().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("jadwal_pelajaran")
      .select("id, hari, jam_ke, jam_mulai, jam_selesai, rombel_id, kelompok_belajar_id, mata_pelajaran_id, guru_id")
      .order("hari")
      .order("jam_ke");
    if (data.rombelId) q = q.eq("rombel_id", data.rombelId);
    if (data.kelompokId) q = q.eq("kelompok_belajar_id", data.kelompokId);
    if (data.guruId) q = q.eq("guru_id", data.guruId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const rids = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean) as string[])];
    const kids = [...new Set((rows ?? []).map((r: any) => r.kelompok_belajar_id).filter(Boolean) as string[])];
    const mids = [...new Set((rows ?? []).map((r) => r.mata_pelajaran_id).filter(Boolean) as string[])];
    const gids = [...new Set((rows ?? []).map((r) => r.guru_id).filter(Boolean) as string[])];

    const [rombel, kelompok, mapel, guru] = await Promise.all([
      rids.length ? context.supabase.from("rombel").select("id, name").in("id", rids) : Promise.resolve({ data: [] }),
      kids.length ? context.supabase.from("kelompok_belajar").select("id, nama").in("id", kids) : Promise.resolve({ data: [] }),
      mids.length ? context.supabase.from("mata_pelajaran").select("id, nama, kode").in("id", mids) : Promise.resolve({ data: [] }),
      gids.length ? context.supabase.from("guru").select("id, nama").in("id", gids) : Promise.resolve({ data: [] }),
    ]);
    const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));
    const kMap = new Map((kelompok.data ?? []).map((x: any) => [x.id, x.nama]));
    const mMap = new Map((mapel.data ?? []).map((x: any) => [x.id, x]));
    const gMap = new Map((guru.data ?? []).map((x: any) => [x.id, x.nama]));

    return (rows ?? []).map((r: any) => ({
      ...r,
      rombel_name: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : (r.kelompok_belajar_id ? kMap.get(r.kelompok_belajar_id) ?? "—" : "—"),
      kelompok_name: r.kelompok_belajar_id ? kMap.get(r.kelompok_belajar_id) ?? "—" : null,
      is_kelompok: !!r.kelompok_belajar_id,
      mapel_nama: r.mata_pelajaran_id ? (mMap.get(r.mata_pelajaran_id) as any)?.nama ?? "—" : "—",
      mapel_kode: r.mata_pelajaran_id ? (mMap.get(r.mata_pelajaran_id) as any)?.kode ?? "" : "",
      guru_nama: r.guru_id ? gMap.get(r.guru_id) ?? "—" : "—",
    }));
  });

export const jadwalOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [rombel, kelompok, mapel, guru, alokasi] = await Promise.all([
      context.supabase.from("rombel").select("id, name").order("name"),
      context.supabase.from("kelompok_belajar").select("id, nama").order("nama"),
      context.supabase.from("mata_pelajaran").select("id, nama, kode").order("nama"),
      context.supabase.from("guru").select("id, nama").order("nama"),
      context.supabase.from("jadwal_alokasi_waktu").select("id, hari, jam_ke, jam_mulai, jam_selesai").order("hari").order("jam_ke"),
    ]);
    return {
      rombel: rombel.data ?? [],
      kelompok: kelompok.data ?? [],
      mapel: mapel.data ?? [],
      guru: guru.data ?? [],
      alokasi: alokasi.data ?? [],
    };
  });

export const createJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      hari: z.enum(HARI),
      jamKe: z.number().int().min(1).max(20),
      jamMulai: z.string().optional(),
      jamSelesai: z.string().optional(),
      rombelId: z.string().uuid().optional(),
      kelompokId: z.string().uuid().optional(),
      mataPelajaranId: z.string().uuid(),
      guruId: z.string().uuid(),
    }).refine((d) => !!d.rombelId !== !!d.kelompokId, {
      message: "Pilih salah satu: Rombel atau Kelompok Belajar",
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("jadwal_pelajaran").insert({
      hari: data.hari,
      jam_ke: data.jamKe,
      jam_mulai: data.jamMulai || null,
      jam_selesai: data.jamSelesai || null,
      rombel_id: data.rombelId ?? null,
      kelompok_belajar_id: data.kelompokId ?? null,
      mata_pelajaran_id: data.mataPelajaranId,
      guru_id: data.guruId,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("jadwal_pelajaran").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid().optional(),
      kelompokId: z.string().uuid().optional(),
      guruId: z.string().uuid().optional(),
      scope: z.enum(["filtered", "all"]).default("filtered"),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { data: isAdm } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId)
      .in("role", ["admin", "superadmin"]).maybeSingle();
    if (!isAdm) throw new Error("Hanya admin yang boleh menghapus semua jadwal");

    let q = context.supabase.from("jadwal_pelajaran").delete({ count: "exact" });
    if (data.scope === "filtered") {
      if (data.rombelId) q = q.eq("rombel_id", data.rombelId);
      if (data.kelompokId) q = q.eq("kelompok_belajar_id", data.kelompokId);
      if (data.guruId) q = q.eq("guru_id", data.guruId);
    }
    const { error, count } = await q.not("id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: count ?? 0 };
  });

const SlotSchema = z.object({
  hari: z.enum(HARI),
  jamKe: z.number().int().min(1).max(20),
  jamMulai: z.string().optional(),
  jamSelesai: z.string().optional(),
});

export const bulkCreateJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      rombelId: z.string().uuid().optional(),
      kelompokId: z.string().uuid().optional(),
      mataPelajaranId: z.string().uuid(),
      guruId: z.string().uuid(),
      slots: z.array(SlotSchema).min(1),
    }).refine((d) => !!d.rombelId !== !!d.kelompokId, {
      message: "Pilih salah satu: Rombel atau Kelompok Belajar",
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const rows = data.slots.map((s) => ({
      hari: s.hari,
      jam_ke: s.jamKe,
      jam_mulai: s.jamMulai || null,
      jam_selesai: s.jamSelesai || null,
      rombel_id: data.rombelId ?? null,
      kelompok_belajar_id: data.kelompokId ?? null,
      mata_pelajaran_id: data.mataPelajaranId,
      guru_id: data.guruId,
      created_by: context.userId,
    }));
    const { error } = await context.supabase.from("jadwal_pelajaran").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });

export const bulkUpdateJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      ids: z.array(z.string().uuid()).min(1),
      mataPelajaranId: z.string().uuid(),
      guruId: z.string().uuid(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("jadwal_pelajaran")
      .update({ mata_pelajaran_id: data.mataPelajaranId, guru_id: data.guruId })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, updated: data.ids.length };
  });

export const bulkDeleteJadwal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ ids: z.array(z.string().uuid()).min(1) }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("jadwal_pelajaran")
      .delete()
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.ids.length };
  });

export const listAlokasiWaktu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jadwal_alokasi_waktu")
      .select("id, hari, jam_ke, jam_mulai, jam_selesai")
      .order("hari").order("jam_ke");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const AlokasiRowSchema = z.object({
  hari: z.enum(HARI),
  jamKe: z.number().int().min(1).max(20),
  jamMulai: z.string().min(1),
  jamSelesai: z.string().min(1),
});

export const upsertAlokasiWaktu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ rows: z.array(AlokasiRowSchema).min(1) }).parse)
  .handler(async ({ context, data }) => {
    const { data: isAdm } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId)
      .in("role", ["admin", "superadmin"]).maybeSingle();
    if (!isAdm) throw new Error("Hanya admin yang boleh mengubah alokasi waktu");

    for (const r of data.rows) {
      const { data: existing } = await context.supabase
        .from("jadwal_alokasi_waktu").select("id")
        .eq("hari", r.hari).eq("jam_ke", r.jamKe).maybeSingle();
      if (existing?.id) {
        const { error } = await context.supabase.from("jadwal_alokasi_waktu")
          .update({ jam_mulai: r.jamMulai, jam_selesai: r.jamSelesai, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await context.supabase.from("jadwal_alokasi_waktu")
          .insert({ hari: r.hari, jam_ke: r.jamKe, jam_mulai: r.jamMulai, jam_selesai: r.jamSelesai, created_by: context.userId });
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true, count: data.rows.length };
  });

