import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error(`Forbidden: ${error.message}`);
  if (!data) throw new Error("Forbidden: hanya admin yang dapat mengelola Kelompok Belajar");
}

export type PembimbingRef = { type: "guru" | "tendik"; id: string };

export const listKelompokBelajar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [kb, pemb, ang, guru, tendik] = await Promise.all([
      supabase.from("kelompok_belajar").select("id, nama, created_at, updated_at").order("nama"),
      supabase.from("kelompok_belajar_pembimbing").select("kelompok_id, pembimbing_type, pembimbing_id"),
      supabase.from("kelompok_belajar_anggota").select("kelompok_id, student_id"),
      supabase.from("guru").select("id, nama, nip"),
      supabase.from("tendik").select("id, nama, nip"),
    ]);
    if (kb.error) throw new Error(kb.error.message);
    const guruMap = new Map((guru.data ?? []).map((g: any) => [g.id, g]));
    const tendikMap = new Map((tendik.data ?? []).map((t: any) => [t.id, t]));

    const groups = (kb.data ?? []).map((k: any) => {
      const pembimbings = (pemb.data ?? [])
        .filter((p: any) => p.kelompok_id === k.id)
        .map((p: any) => {
          const src = p.pembimbing_type === "guru" ? guruMap.get(p.pembimbing_id) : tendikMap.get(p.pembimbing_id);
          return {
            type: p.pembimbing_type as "guru" | "tendik",
            id: p.pembimbing_id as string,
            nama: (src as any)?.nama ?? "(tidak ditemukan)",
            nip: (src as any)?.nip ?? null,
          };
        });
      const anggota_ids = (ang.data ?? [])
        .filter((a: any) => a.kelompok_id === k.id)
        .map((a: any) => a.student_id as string);
      return {
        id: k.id as string,
        nama: k.nama as string,
        created_at: k.created_at as string,
        updated_at: k.updated_at as string,
        pembimbings,
        anggota_ids,
        anggota_count: anggota_ids.length,
      };
    });
    return groups;
  });

export const getKelompokBelajarDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: kb, error } = await supabase
      .from("kelompok_belajar")
      .select("id, nama, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!kb) throw new Error("Kelompok belajar tidak ditemukan");

    const [pemb, ang] = await Promise.all([
      supabase.from("kelompok_belajar_pembimbing").select("pembimbing_type, pembimbing_id").eq("kelompok_id", data.id),
      supabase.from("kelompok_belajar_anggota").select("student_id").eq("kelompok_id", data.id),
    ]);

    const guruIds = (pemb.data ?? []).filter((p: any) => p.pembimbing_type === "guru").map((p: any) => p.pembimbing_id);
    const tendikIds = (pemb.data ?? []).filter((p: any) => p.pembimbing_type === "tendik").map((p: any) => p.pembimbing_id);
    const studentIds = (ang.data ?? []).map((a: any) => a.student_id);

    const [guru, tendik, students] = await Promise.all([
      guruIds.length
        ? supabase.from("guru").select("id, nama, nip").in("id", guruIds)
        : Promise.resolve({ data: [] as any[] }),
      tendikIds.length
        ? supabase.from("tendik").select("id, nama, nip").in("id", tendikIds)
        : Promise.resolve({ data: [] as any[] }),
      studentIds.length
        ? supabase.from("students").select("id, name, nis, rombel_id").in("id", studentIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const rombelIds = Array.from(new Set(((students.data ?? []) as any[]).map((s) => s.rombel_id).filter(Boolean)));
    const rombel = rombelIds.length
      ? await supabase.from("rombel").select("id, name, tingkat").in("id", rombelIds)
      : { data: [] as any[] };
    const rombelMap = new Map(((rombel.data ?? []) as any[]).map((r) => [r.id, r]));

    const guruMap = new Map(((guru.data ?? []) as any[]).map((g) => [g.id, g]));
    const tendikMap = new Map(((tendik.data ?? []) as any[]).map((t) => [t.id, t]));

    const pembimbings = (pemb.data ?? []).map((p: any) => {
      const src = p.pembimbing_type === "guru" ? guruMap.get(p.pembimbing_id) : tendikMap.get(p.pembimbing_id);
      return {
        type: p.pembimbing_type as "guru" | "tendik",
        id: p.pembimbing_id as string,
        nama: (src as any)?.nama ?? "(tidak ditemukan)",
        nip: (src as any)?.nip ?? null,
      };
    });

    const anggota = ((students.data ?? []) as any[])
      .map((s) => {
        const r = s.rombel_id ? rombelMap.get(s.rombel_id) : null;
        return {
          id: s.id as string,
          name: (s.name as string) ?? "",
          nis: (s.nis as string) ?? null,
          rombel_name: (r as any)?.name ?? null,
          rombel_tingkat: (r as any)?.tingkat ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: kb.id as string,
      nama: kb.nama as string,
      created_at: kb.created_at as string,
      updated_at: kb.updated_at as string,
      pembimbings,
      anggota,
    };
  });

export const listRombelWithStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const rombelRes = await supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian")
      .order("tingkat")
      .order("name");
    if (rombelRes.error) throw new Error(rombelRes.error.message);

    const pageSize = 1000;
    const students: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, nis, rombel_id")
        .order("name")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const batch = data ?? [];
      students.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return {
      rombel: rombelRes.data ?? [],
      students,
    };
  });


export const listPembimbingCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [guru, tendik] = await Promise.all([
      supabase.from("guru").select("id, nama, nip").order("nama"),
      supabase.from("tendik").select("id, nama, nip").order("nama"),
    ]);
    return {
      guru: guru.data ?? [],
      tendik: tendik.data ?? [],
    };
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  nama: z.string().min(1),
  pembimbings: z.array(z.object({ type: z.enum(["guru", "tendik"]), id: z.string().uuid() })),
  anggota_ids: z.array(z.string().uuid()),
});

export const saveKelompokBelajar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase } = context;
    let kelompokId = data.id;
    if (kelompokId) {
      const { error } = await supabase
        .from("kelompok_belajar")
        .update({ nama: data.nama })
        .eq("id", kelompokId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await supabase
        .from("kelompok_belajar")
        .insert({ nama: data.nama })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      kelompokId = ins.id as string;
    }

    // Replace pembimbings
    await supabase.from("kelompok_belajar_pembimbing").delete().eq("kelompok_id", kelompokId);
    if (data.pembimbings.length) {
      const rows = data.pembimbings.map((p) => ({
        kelompok_id: kelompokId!,
        pembimbing_type: p.type,
        pembimbing_id: p.id,
      }));
      const { error } = await supabase.from("kelompok_belajar_pembimbing").insert(rows);
      if (error) throw new Error(error.message);
    }

    // Replace anggota
    await supabase.from("kelompok_belajar_anggota").delete().eq("kelompok_id", kelompokId);
    if (data.anggota_ids.length) {
      const rows = data.anggota_ids.map((sid) => ({ kelompok_id: kelompokId!, student_id: sid }));
      const { error } = await supabase.from("kelompok_belajar_anggota").insert(rows);
      if (error) throw new Error(error.message);
    }

    return { id: kelompokId };
  });

export const deleteKelompokBelajar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("kelompok_belajar").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const importSchema = z.object({
  mode: z.enum(["upsert", "replace_all"]).default("upsert"),
  rows: z.array(z.object({
    nama: z.string().min(1),
    anggota_names: z.array(z.string()).default([]),
    pembimbing_names: z.array(z.string()).default([]),
  })).min(1),
});

function normName(s: string) {
  return String(s).trim().toLowerCase().replace(/\s+/g, " ");
}

export const importKelompokBelajar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => importSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabase } = context;

    // Load all students (chunked)
    const students: any[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch, error } = await supabase
        .from("students").select("id, name, nis").range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const rows = batch ?? [];
      students.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    const [{ data: guruList }, { data: tendikList }] = await Promise.all([
      supabase.from("guru").select("id, nama"),
      supabase.from("tendik").select("id, nama"),
    ]);

    // Name -> [ids] (may have duplicates)
    const stuByName = new Map<string, string[]>();
    for (const s of students as any[]) {
      if (!s.name) continue;
      const k = normName(s.name);
      const arr = stuByName.get(k) ?? [];
      arr.push(s.id as string);
      stuByName.set(k, arr);
    }
    const guruByName = new Map<string, string[]>();
    for (const g of (guruList ?? []) as any[]) {
      if (!g.nama) continue;
      const k = normName(g.nama);
      const arr = guruByName.get(k) ?? [];
      arr.push(g.id as string);
      guruByName.set(k, arr);
    }
    const tendikByName = new Map<string, string[]>();
    for (const t of (tendikList ?? []) as any[]) {
      if (!t.nama) continue;
      const k = normName(t.nama);
      const arr = tendikByName.get(k) ?? [];
      arr.push(t.id as string);
      tendikByName.set(k, arr);
    }

    const { data: existing } = await supabase.from("kelompok_belajar").select("id, nama");
    const existingByNama = new Map(
      (existing ?? []).map((k: any) => [String(k.nama).toLowerCase().trim(), k.id as string]),
    );

    if (data.mode === "replace_all") {
      const ids = (existing ?? []).map((k: any) => k.id);
      if (ids.length) {
        const { error } = await supabase.from("kelompok_belajar").delete().in("id", ids);
        if (error) throw new Error(error.message);
      }
      existingByNama.clear();
    }

    const report = {
      created: 0,
      updated: 0,
      total_anggota: 0,
      total_pembimbing: 0,
      missing_names: [] as string[],
      missing_pembimbing: [] as string[],
      ambiguous_names: [] as string[],
      ambiguous_pembimbing: [] as string[],
      errors: [] as string[],
    };

    for (const row of data.rows) {
      try {
        const key = row.nama.toLowerCase().trim();
        let kelompokId = existingByNama.get(key);
        if (kelompokId) {
          await supabase.from("kelompok_belajar").update({ nama: row.nama.trim() }).eq("id", kelompokId);
          report.updated += 1;
        } else {
          const { data: ins, error } = await supabase
            .from("kelompok_belajar").insert({ nama: row.nama.trim() }).select("id").single();
          if (error) throw new Error(error.message);
          kelompokId = ins.id as string;
          existingByNama.set(key, kelompokId);
          report.created += 1;
        }

        const anggotaIds: string[] = [];
        for (const raw of row.anggota_names) {
          const name = String(raw).trim();
          if (!name) continue;
          const matches = stuByName.get(normName(name)) ?? [];
          if (matches.length === 0) {
            report.missing_names.push(`${row.nama}: ${name}`);
          } else if (matches.length > 1) {
            report.ambiguous_names.push(`${row.nama}: ${name} (${matches.length} murid)`);
            anggotaIds.push(matches[0]);
          } else {
            anggotaIds.push(matches[0]);
          }
        }
        const uniqAnggota = Array.from(new Set(anggotaIds));

        const pemb: { type: "guru" | "tendik"; id: string }[] = [];
        for (const raw of row.pembimbing_names) {
          const name = String(raw).trim();
          if (!name) continue;
          const k = normName(name);
          const gMatches = guruByName.get(k) ?? [];
          const tMatches = tendikByName.get(k) ?? [];
          const total = gMatches.length + tMatches.length;
          if (total === 0) {
            report.missing_pembimbing.push(`${row.nama}: ${name}`);
          } else if (total > 1) {
            report.ambiguous_pembimbing.push(`${row.nama}: ${name} (${total} kandidat)`);
            if (gMatches.length) pemb.push({ type: "guru", id: gMatches[0] });
            else pemb.push({ type: "tendik", id: tMatches[0] });
          } else if (gMatches.length === 1) {
            pemb.push({ type: "guru", id: gMatches[0] });
          } else {
            pemb.push({ type: "tendik", id: tMatches[0] });
          }
        }

        await supabase.from("kelompok_belajar_anggota").delete().eq("kelompok_id", kelompokId);
        if (uniqAnggota.length) {
          const insRows = uniqAnggota.map((sid) => ({ kelompok_id: kelompokId!, student_id: sid }));
          const { error } = await supabase.from("kelompok_belajar_anggota").insert(insRows);
          if (error) throw new Error(error.message);
        }
        await supabase.from("kelompok_belajar_pembimbing").delete().eq("kelompok_id", kelompokId);
        if (pemb.length) {
          const insRows = pemb.map((p) => ({
            kelompok_id: kelompokId!, pembimbing_type: p.type, pembimbing_id: p.id,
          }));
          const { error } = await supabase.from("kelompok_belajar_pembimbing").insert(insRows);
          if (error) throw new Error(error.message);
        }
        report.total_anggota += uniqAnggota.length;
        report.total_pembimbing += pemb.length;
      } catch (e: any) {
        report.errors.push(`${row.nama}: ${e?.message ?? String(e)}`);
      }
    }

    return report;
  });

