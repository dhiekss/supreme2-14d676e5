import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAllowedRombelIds } from "@/lib/rombel-access";
import { z } from "zod";

// ============ Options / dependent selects ============

export const listRombelForKbm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const allowed = await getAllowedRombelIds(context.supabase, context.userId);
    let q = context.supabase.from("rombel").select("id, name").order("name");
    if (allowed !== null) {
      if (allowed.length === 0) return [];
      q = q.in("id", allowed);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMapelByRombel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ rombel_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("rombel_mata_pelajaran")
      .select("mata_pelajaran_id")
      .eq("rombel_id", data.rombel_id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r: any) => r.mata_pelajaran_id).filter(Boolean))];
    if (!ids.length) return [];
    const { data: mapel, error: e2 } = await context.supabase
      .from("mata_pelajaran")
      .select("id, nama, kode")
      .in("id", ids)
      .order("nama");
    if (e2) throw new Error(e2.message);
    return mapel ?? [];
  });

export const listGuruByRombelMapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ rombel_id: z.string().uuid(), mata_pelajaran_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("rombel_mata_pelajaran")
      .select("guru_id")
      .eq("rombel_id", data.rombel_id)
      .eq("mata_pelajaran_id", data.mata_pelajaran_id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r: any) => r.guru_id).filter(Boolean))];
    if (!ids.length) return [];
    const { data: guru, error: e2 } = await context.supabase
      .from("guru")
      .select("id, nama, nip")
      .in("id", ids)
      .order("nama");
    if (e2) throw new Error(e2.message);
    return guru ?? [];
  });

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export const listJadwalForKbm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ rombel_id: z.string().uuid(), tanggal: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const dow = new Date(data.tanggal + "T00:00:00").getDay();
    const hari = HARI_ID[dow];
    const { data: rows, error } = await context.supabase
      .from("jadwal_pelajaran")
      .select("id, hari, jam_ke, jam_mulai, jam_selesai, mata_pelajaran_id, guru_id")
      .eq("rombel_id", data.rombel_id)
      .eq("hari", hari)
      .order("jam_ke");
    if (error) throw new Error(error.message);
    const mIds = [...new Set((rows ?? []).map((r: any) => r.mata_pelajaran_id).filter(Boolean))];
    const gIds = [...new Set((rows ?? []).map((r: any) => r.guru_id).filter(Boolean))];
    const [mapel, guru] = await Promise.all([
      mIds.length ? context.supabase.from("mata_pelajaran").select("id, nama").in("id", mIds) : Promise.resolve({ data: [] as any[] }),
      gIds.length ? context.supabase.from("guru").select("id, nama").in("id", gIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const mMap = new Map((mapel.data ?? []).map((x: any) => [x.id, x.nama]));
    const gMap = new Map((guru.data ?? []).map((x: any) => [x.id, x.nama]));
    // Group by mata_pelajaran_id + guru_id → merge consecutive jam_ke
    const groups = new Map<string, { mata_pelajaran_id: string; guru_id: string; mapel_nama: string; guru_nama: string; jam_list: number[]; jam_mulai: string | null; jam_selesai: string | null }>();
    for (const r of rows ?? []) {
      if (!r.mata_pelajaran_id || !r.guru_id || r.jam_ke == null) continue;
      const jam = r.jam_ke as number;
      const key = `${r.mata_pelajaran_id}::${r.guru_id}`;
      const g = groups.get(key);
      if (g) {
        g.jam_list.push(jam);
        if (r.jam_selesai) g.jam_selesai = r.jam_selesai;
      } else {
        groups.set(key, {
          mata_pelajaran_id: r.mata_pelajaran_id,
          guru_id: r.guru_id,
          mapel_nama: mMap.get(r.mata_pelajaran_id) ?? "—",
          guru_nama: gMap.get(r.guru_id) ?? "—",
          jam_list: [jam],
          jam_mulai: r.jam_mulai,
          jam_selesai: r.jam_selesai,
        });
      }
    }
    return { hari, sessions: Array.from(groups.values()).map((g) => ({ ...g, jam_list: [...new Set(g.jam_list)].sort((a, b) => a - b) })) };
  });

// Kept for Rekap KBM filters (all guru/mapel/rombel)
export const listLaporanKbmOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const allowed = await getAllowedRombelIds(context.supabase, context.userId);
    let rombelQ = context.supabase.from("rombel").select("id, name").order("name");
    if (allowed !== null) {
      if (allowed.length === 0) {
        const [mapel, guru] = await Promise.all([
          context.supabase.from("mata_pelajaran").select("id, nama").order("nama"),
          context.supabase.from("guru").select("id, nama").order("nama"),
        ]);
        return { rombel: [], mapel: mapel.data ?? [], guru: guru.data ?? [] };
      }
      rombelQ = rombelQ.in("id", allowed);
    }
    const [rombel, mapel, guru] = await Promise.all([
      rombelQ,
      context.supabase.from("mata_pelajaran").select("id, nama").order("nama"),
      context.supabase.from("guru").select("id, nama").order("nama"),
    ]);
    return {
      rombel: rombel.data ?? [],
      mapel: mapel.data ?? [],
      guru: guru.data ?? [],
    };
  });

// ============ List / Delete ============

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
    const allowed = await getAllowedRombelIds(s, context.userId);
    if (allowed !== null && allowed.length === 0) return [];

    let q = s
      .from("kbm_laporan")
      .select(
        "id, tanggal, jam_list, jam_status, rombel_id, mata_pelajaran_id, guru_id, guru_status, materi, capaian_pembelajaran, jumlah_hadir, jumlah_izin, jumlah_sakit, jumlah_alpa, catatan, ttd_path, foto_path, created_at",
      )
      .order("tanggal", { ascending: false })
      .limit(data?.limit ?? 200);

    if (allowed !== null) q = q.in("rombel_id", allowed);
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

export const deleteLaporanKbm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("kbm_laporan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Upload media (TTD / Foto) ============

const uploadSchema = z.object({
  kind: z.enum(["ttd", "foto"]),
  dataUrl: z.string().min(1),
  ext: z.string().min(1).max(6),
});

export const uploadKbmMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => uploadSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const match = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Format data URL tidak valid");
    const contentType = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");
    const path = `${data.kind}/${context.userId}/${Date.now()}.${data.ext}`;
    const { error } = await supabaseAdmin.storage
      .from("kbm-foto")
      .upload(path, buffer, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

export const signKbmMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("kbm-foto")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

// ============ Create ============

const createSchema = z.object({
  tanggal: z.string(),
  rombel_id: z.string().uuid(),
  mata_pelajaran_id: z.string().uuid(),
  guru_id: z.string().uuid(),
  jam_list: z.array(z.number().int().min(1).max(12)).min(1, "Pilih minimal 1 jam"),
  jam_status: z.record(z.string(), z.enum(["M", "T+", "T-"])),
  ttd_path: z.string().min(1, "Tanda tangan wajib diisi"),
  foto_path: z.string().min(1, "Foto kegiatan wajib diunggah"),
});

export const createLaporanKbm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: sem } = await context.supabase
      .from("semester")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    const { error } = await context.supabase.from("kbm_laporan").insert({
      tanggal: data.tanggal,
      rombel_id: data.rombel_id,
      mata_pelajaran_id: data.mata_pelajaran_id,
      guru_id: data.guru_id,
      jam_list: data.jam_list,
      jam_status: data.jam_status,
      ttd_path: data.ttd_path,
      foto_path: data.foto_path,
      semester_id: sem?.id ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Attendance detail for KBM report detail dialog ============

export const getAttendanceDetailForKbm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d) =>
      z.object({
        rombel_id: z.string().uuid(),
        tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const allowed = await getAllowedRombelIds(s, context.userId);
    if (allowed !== null && !allowed.includes(data.rombel_id)) {
      return {
        has_record: false,
        students: [],
        summary: { H: 0, S: 0, I: 0, A: 0, P: 0, total: 0 },
        officer_name: null,
      };
    }

    // Murid aktif di rombel
    const { data: students, error: stErr } = await s
      .from("students")
      .select("id, nis, name, gender")
      .eq("rombel_id", data.rombel_id)
      .order("name");
    if (stErr) throw new Error(stErr.message);

    // Record presensi harian
    const { data: rec } = await s
      .from("attendance_records")
      .select("id, officer_name")
      .eq("rombel_id", data.rombel_id)
      .eq("date", data.tanggal)
      .maybeSingle();

    let details: any[] = [];
    if (rec) {
      const { data: det } = await s
        .from("attendance_details")
        .select("student_id, status")
        .eq("attendance_record_id", rec.id);
      details = det ?? [];
    }

    const detailMap = new Map(details.map((d) => [d.student_id, d.status]));
    const rows = (students ?? []).map((s) => ({
      id: s.id,
      nis: s.nis,
      name: s.name,
      gender: s.gender,
      status: (detailMap.get(s.id) as "H" | "S" | "I" | "A" | "P") ?? "H",
    }));

    const summary = { H: 0, S: 0, I: 0, A: 0, P: 0, total: rows.length };
    for (const r of rows) summary[r.status]++;

    return {
      has_record: !!rec,
      students: rows,
      summary,
      officer_name: rec?.officer_name ?? null,
    };
  });


