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

export const listRombelWithStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [rombel, students] = await Promise.all([
      supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian").order("tingkat").order("name"),
      supabase.from("students").select("id, name, nis, rombel_id").order("name"),
    ]);
    if (rombel.error) throw new Error(rombel.error.message);
    if (students.error) throw new Error(students.error.message);
    return {
      rombel: rombel.data ?? [],
      students: students.data ?? [],
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
