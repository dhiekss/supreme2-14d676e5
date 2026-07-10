import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const STATUS = ["Hadir", "Izin", "Sakit", "Dinas Luar"] as const;

export const listLaporanKbmOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [rombel, mapel, guru] = await Promise.all([
      context.supabase.from("rombel").select("id, name").order("name"),
      context.supabase.from("mata_pelajaran").select("id, nama").order("nama"),
      context.supabase.from("guru").select("id, nama").order("nama"),
    ]);
    return {
      rombel: rombel.data ?? [],
      mapel: mapel.data ?? [],
      guru: guru.data ?? [],
    };
  });

export const listLaporanKbm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        limit: z.number().min(1).max(500).default(200),
        rombel_id: z.string().optional(),
        guru_id: z.string().optional(),
        mapel_id: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    let q = s
      .from("kbm_laporan")
      .select(
        "id, tanggal, jam_mulai, jam_selesai, rombel_id, mata_pelajaran_id, guru_id, guru_status, materi, capaian_pembelajaran, jumlah_hadir, jumlah_izin, jumlah_sakit, jumlah_alpa, catatan, created_at",
      )
      .order("tanggal", { ascending: false })
      .order("jam_mulai", { ascending: true })
      .limit(data?.limit ?? 200);

    if (data?.rombel_id && data.rombel_id !== "all") q = q.eq("rombel_id", data.rombel_id);
    if (data?.guru_id && data.guru_id !== "all") q = q.eq("guru_id", data.guru_id);
    if (data?.mapel_id && data.mapel_id !== "all") q = q.eq("mata_pelajaran_id", data.mapel_id);
    if (data?.from) q = q.gte("tanggal", data.from);
    if (data?.to) q = q.lte("tanggal", data.to);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const rIds = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean) as string[])];
    const mIds = [...new Set((rows ?? []).map((r) => r.mata_pelajaran_id).filter(Boolean) as string[])];
    const gIds = [...new Set((rows ?? []).map((r) => r.guru_id).filter(Boolean) as string[])];
    const [rombel, mapel, guru] = await Promise.all([
      rIds.length ? s.from("rombel").select("id, name").in("id", rIds) : Promise.resolve({ data: [] as any[] }),
      mIds.length ? s.from("mata_pelajaran").select("id, nama").in("id", mIds) : Promise.resolve({ data: [] as any[] }),
      gIds.length ? s.from("guru").select("id, nama").in("id", gIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const rMap = new Map((rombel.data ?? []).map((x: any) => [x.id, x.name]));
    const mMap = new Map((mapel.data ?? []).map((x: any) => [x.id, x.nama]));
    const gMap = new Map((guru.data ?? []).map((x: any) => [x.id, x.nama]));

    return (rows ?? []).map((r) => ({
      ...r,
      rombel_name: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
      mapel_name: r.mata_pelajaran_id ? mMap.get(r.mata_pelajaran_id) ?? "—" : "—",
      guru_name: r.guru_id ? gMap.get(r.guru_id) ?? "—" : "—",
    }));
  });

const inputSchema = z.object({
  tanggal: z.string(),
  jam_mulai: z.number().int().min(1).max(12),
  jam_selesai: z.number().int().min(1).max(12),
  rombel_id: z.string().uuid(),
  mata_pelajaran_id: z.string().uuid(),
  guru_id: z.string().uuid(),
  guru_status: z.enum(STATUS).default("Hadir"),
  materi: z.string().max(3000).optional().default(""),
  capaian_pembelajaran: z.string().max(3000).optional().default(""),
  jumlah_hadir: z.number().int().min(0).default(0),
  jumlah_izin: z.number().int().min(0).default(0),
  jumlah_sakit: z.number().int().min(0).default(0),
  jumlah_alpa: z.number().int().min(0).default(0),
  catatan: z.string().max(2000).optional().default(""),
});

export const createLaporanKbm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: sem } = await context.supabase
      .from("semester")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    const { error } = await context.supabase.from("kbm_laporan").insert({
      ...data,
      semester_id: sem?.id ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLaporanKbm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("kbm_laporan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
