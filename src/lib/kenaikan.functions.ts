import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listKenaikanRefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [rombel, tahun, semester, students] = await Promise.all([
      supabase.from("rombel").select("id, name, tingkat, is_khusus").order("name"),
      supabase.from("tahun_ajaran").select("id, nama, is_active").order("nama"),
      supabase.from("semester").select("id, nama, tahun_ajaran_id, is_active").order("nama"),
      (async () => {
        // Paginate to bypass PostgREST default 1000-row cap
        const counts: Record<string, number> = {};
        const pageSize = 1000;
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("students")
            .select("rombel_id")
            .range(from, from + pageSize - 1);
          if (error) throw new Error(error.message);
          const rows = data ?? [];
          for (const s of rows as any[]) {
            if (s.rombel_id) counts[s.rombel_id] = (counts[s.rombel_id] ?? 0) + 1;
          }
          if (rows.length < pageSize) break;
          from += pageSize;
        }
        return counts;
      })(),
    ]);
    if (rombel.error) throw new Error(rombel.error.message);
    const counts = students as Record<string, number>;

    return {
      rombel: (rombel.data ?? []).map((r: any) => ({ ...r, siswa_count: counts[r.id] ?? 0 })),
      tahun: tahun.data ?? [],
      semester: semester.data ?? [],
    };
  });

export const previewPromotion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rombel_asal_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [siswa, rombel, resign, out] = await Promise.all([
      supabase.from("students").select("id, name, nis").eq("rombel_id", data.rombel_asal_id).order("name"),
      supabase.from("rombel").select("id, name, tingkat").eq("id", data.rombel_asal_id).maybeSingle(),
      supabase.from("student_resignations").select("student_id"),
      supabase.from("student_transfers_out").select("student_id"),
    ]);
    if (siswa.error) throw new Error(siswa.error.message);
    const excluded = new Set<string>([
      ...(resign.data ?? []).map((r: any) => r.student_id).filter(Boolean),
      ...(out.data ?? []).map((r: any) => r.student_id).filter(Boolean),
    ]);
    const tingkat = String(rombel.data?.tingkat ?? "").toUpperCase();
    const isFinal = tingkat === "XII" || tingkat === "12";
    const items = (siswa.data ?? []).map((s: any) => {
      let status: "naik" | "tinggal" | "lulus" | "keluar" = "naik";
      if (excluded.has(s.id)) status = "keluar";
      else if (isFinal) status = "lulus";
      return { student_id: s.id, name: s.name, nis: s.nis, status, locked: excluded.has(s.id) };
    });
    return { rombel: rombel.data, isFinal, items };
  });

export const commitPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    rombel_asal_id: string;
    rombel_tujuan_id?: string | null;
    tahun_ajaran_tujuan_id?: string | null;
    semester_tujuan_id?: string | null;
    tahun_ajaran_asal_id?: string | null;
    semester_asal_id?: string | null;
    tanggal_proses?: string;
    catatan?: string;
    items: Array<{
      student_id: string;
      status: "naik" | "tinggal" | "lulus" | "keluar";
      rombel_tujuan_override?: string | null;
    }>;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const batch_id = crypto.randomUUID();

    // fetch snapshots
    const sids = data.items.map((i) => i.student_id);
    const rids = new Set<string>([data.rombel_asal_id]);
    if (data.rombel_tujuan_id) rids.add(data.rombel_tujuan_id);
    data.items.forEach((i) => i.rombel_tujuan_override && rids.add(i.rombel_tujuan_override));

    const [studentsRes, rombelRes] = await Promise.all([
      supabase.from("students").select("id, name, nis").in("id", sids),
      supabase.from("rombel").select("id, name").in("id", [...rids]),
    ]);
    if (studentsRes.error) throw new Error(studentsRes.error.message);
    if (rombelRes.error) throw new Error(rombelRes.error.message);
    const sMap = new Map((studentsRes.data ?? []).map((s: any) => [s.id, s]));
    const rMap = new Map((rombelRes.data ?? []).map((r: any) => [r.id, r]));
    const asalName = rMap.get(data.rombel_asal_id)?.name ?? null;

    const rows: any[] = [];
    // Group updates by target rombel_id (or null)
    const updates = new Map<string | null, string[]>();

    for (const it of data.items) {
      let tujuanId: string | null = null;
      if (it.status === "naik") tujuanId = it.rombel_tujuan_override ?? data.rombel_tujuan_id ?? null;
      else if (it.status === "tinggal") tujuanId = it.rombel_tujuan_override ?? data.rombel_asal_id;
      // lulus / keluar → null

      const arr = updates.get(tujuanId) ?? [];
      arr.push(it.student_id);
      updates.set(tujuanId, arr);

      const s = sMap.get(it.student_id) as any;
      rows.push({
        batch_id,
        student_id: it.student_id,
        student_name: s?.name ?? null,
        student_nis: s?.nis ?? null,
        rombel_asal_id: data.rombel_asal_id,
        rombel_asal_name: asalName,
        rombel_tujuan_id: tujuanId,
        rombel_tujuan_name: tujuanId ? (rMap.get(tujuanId) as any)?.name ?? null : null,
        tahun_ajaran_asal_id: data.tahun_ajaran_asal_id ?? null,
        tahun_ajaran_tujuan_id: data.tahun_ajaran_tujuan_id ?? null,
        semester_asal_id: data.semester_asal_id ?? null,
        semester_tujuan_id: data.semester_tujuan_id ?? null,
        status: it.status,
        tanggal_proses: data.tanggal_proses ?? new Date().toISOString().slice(0, 10),
        catatan: data.catatan ?? null,
        created_by: userId,
      });
    }

    // insert history
    const ins = await supabase.from("student_promotions").insert(rows);
    if (ins.error) throw new Error(ins.error.message);

    // apply student rombel updates in batches per target
    for (const [tujuanId, ids] of updates.entries()) {
      const upd = await supabase.from("students").update({ rombel_id: tujuanId }).in("id", ids);
      if (upd.error) throw new Error(upd.error.message);
    }

    return { ok: true, batch_id, count: rows.length };
  });

export const listPromotionBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("student_promotions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const tahunIds = new Set<string>();
    const semIds = new Set<string>();
    for (const r of data ?? []) {
      if (r.tahun_ajaran_tujuan_id) tahunIds.add(r.tahun_ajaran_tujuan_id);
      if (r.semester_tujuan_id) semIds.add(r.semester_tujuan_id);
    }
    const [tahunRes, semRes] = await Promise.all([
      tahunIds.size
        ? supabase.from("tahun_ajaran").select("id, nama").in("id", [...tahunIds])
        : Promise.resolve({ data: [] as any[] }),
      semIds.size
        ? supabase.from("semester").select("id, nama").in("id", [...semIds])
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const tahunMap = new Map((tahunRes.data ?? []).map((t: any) => [t.id, t.nama]));
    const semMap = new Map((semRes.data ?? []).map((s: any) => [s.id, s.nama]));

    const map = new Map<string, any>();
    for (const r of data ?? []) {
      const tahunTujuanName = r.tahun_ajaran_tujuan_id ? tahunMap.get(r.tahun_ajaran_tujuan_id) ?? null : null;
      const semesterTujuanName = r.semester_tujuan_id ? semMap.get(r.semester_tujuan_id) ?? null : null;
      const b = map.get(r.batch_id) ?? {
        batch_id: r.batch_id,
        tanggal_proses: r.tanggal_proses,
        created_at: r.created_at,
        rombel_asal_name: r.rombel_asal_name,
        tahun_ajaran_tujuan_name: tahunTujuanName,
        semester_tujuan_name: semesterTujuanName,
        counts: { naik: 0, tinggal: 0, lulus: 0, keluar: 0 },
        items: [] as any[],
      };
      b.counts[r.status as keyof typeof b.counts] = (b.counts[r.status as keyof typeof b.counts] ?? 0) + 1;
      b.items.push({ ...r, tahun_ajaran_tujuan_name: tahunTujuanName, semester_tujuan_name: semesterTujuanName });
      map.set(r.batch_id, b);
    }
    return [...map.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  });

export const undoPromotionBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { batch_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Hanya admin yang dapat membatalkan batch.");

    const { data: rows, error } = await supabase
      .from("student_promotions")
      .select("student_id, rombel_asal_id")
      .eq("batch_id", data.batch_id);
    if (error) throw new Error(error.message);

    // revert grouped by rombel_asal_id
    const groups = new Map<string | null, string[]>();
    for (const r of rows ?? []) {
      const arr = groups.get(r.rombel_asal_id) ?? [];
      if (r.student_id) arr.push(r.student_id);
      groups.set(r.rombel_asal_id, arr);
    }
    for (const [asal, ids] of groups.entries()) {
      if (!ids.length) continue;
      const upd = await supabase.from("students").update({ rombel_id: asal }).in("id", ids);
      if (upd.error) throw new Error(upd.error.message);
    }
    const del = await supabase.from("student_promotions").delete().eq("batch_id", data.batch_id);
    if (del.error) throw new Error(del.error.message);
    return { ok: true };
  });

export const undoPromotionStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { promotion_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Hanya admin yang dapat mengembalikan murid.");

    const { data: row, error } = await supabase
      .from("student_promotions")
      .select("id, student_id, rombel_asal_id, student_name")
      .eq("id", data.promotion_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Data riwayat tidak ditemukan.");
    if (!row.student_id) throw new Error("Riwayat tidak memiliki referensi siswa.");

    const upd = await supabase
      .from("students")
      .update({ rombel_id: row.rombel_asal_id })
      .eq("id", row.student_id);
    if (upd.error) throw new Error(upd.error.message);

    const del = await supabase.from("student_promotions").delete().eq("id", row.id);
    if (del.error) throw new Error(del.error.message);

    return { ok: true, student_name: row.student_name };
  });

