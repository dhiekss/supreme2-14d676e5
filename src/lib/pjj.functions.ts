import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scopePjjQuery } from "./pjj-access";
import { getAllowedRombelIds } from "./rombel-access";
import { matchesPjjSchedule } from "./pjj-schedule";

async function getOptions(context: { supabase: any; userId: string }) {
  const { supabase, userId } = context;
  const [roleRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("profiles").select("nip, full_name").eq("id", userId).maybeSingle(),
  ]);
  if (roleRes.error || profileRes.error) throw new Error("Gagal membaca akun");
  const roles: string[] = (roleRes.data ?? []).map((r: { role: string }) => r.role);
  const admin = roles.some(r => r === "admin" || r === "superadmin");
  let allowed = admin ? null : await getAllowedRombelIds(supabase, userId);
  let mapelIds: string[] | null = null;
  if (!admin && profileRes.data?.nip) {
    const { data: teachers, error } = await supabase.from("guru").select("id").eq("nip", profileRes.data.nip);
    if (error) throw new Error(error.message);
    if (teachers?.length) {
      const teacherIds = teachers.map((r: { id: string }) => r.id);
      const [assigned, scheduled] = await Promise.all([
        supabase.from("rombel_mata_pelajaran").select("rombel_id, mata_pelajaran_id").in("guru_id", teacherIds).is("deleted_at", null),
        supabase.from("jadwal_pelajaran").select("rombel_id, mata_pelajaran_id").in("guru_id", teacherIds),
      ]);
      if (assigned.error || scheduled.error) throw new Error("Gagal membaca penugasan");
      const rows = [...(assigned.data ?? []), ...(scheduled.data ?? [])];
      allowed = [...new Set<string>([...(allowed ?? []), ...rows.map(r => r.rombel_id).filter(Boolean)])];
      mapelIds = [...new Set<string>(rows.map(r => r.mata_pelajaran_id).filter(Boolean))];
    }
  }
  let rombelQuery = supabase.from("rombel").select("id, name").order("name");
  if (allowed !== null) rombelQuery = rombelQuery.in("id", allowed.length ? allowed : ["00000000-0000-0000-0000-000000000000"]);
  let mapelQuery = supabase.from("mata_pelajaran").select("id, nama").order("nama");
  if (mapelIds !== null) mapelQuery = mapelQuery.in("id", mapelIds.length ? mapelIds : ["00000000-0000-0000-0000-000000000000"]);
  const [rombel, mapel] = await Promise.all([rombelQuery, mapelQuery]);
  if (rombel.error || mapel.error) throw new Error("Gagal membaca pilihan PJJ");
  return { userId, roles, isAdmin: admin, nama: profileRes.data?.full_name ?? "", rombel: rombel.data as { id: string; name: string }[], mapel: mapel.data as { id: string; nama: string }[] };
}

export const pjjOptions = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(({ context }) => getOptions(context));

export const pjjStudents = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ rombelId: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const options = await getOptions(context);
    if (!options.rombel.some(r => r.id === data.rombelId)) throw new Error("Rombel tidak dapat diakses");
    const students: { id: string; name: string; nis: string | null }[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await context.supabase.from("students").select("id, name, nis").eq("rombel_id", data.rombelId).order("name").order("id").range(offset, offset + 499);
      if (result.error) throw new Error(result.error.message);
      students.push(...(result.data ?? []).map(s => ({ ...s, name: s.name ?? "—" })));
      if ((result.data?.length ?? 0) < 500) break;
    }
    return students;
  });

export const listPjj = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ recap: z.boolean(), page: z.number().int().min(1), from: z.string().default(""), to: z.string().default(""), rombelId: z.string().default("") }).parse)
  .handler(async ({ context, data }) => {
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (roleError) throw new Error(roleError.message);
    let q = scopePjjQuery(context.supabase.from("pjj_reports").select("id, tanggal, created_by, jam_list, materi, murid_aktif, rombel:rombel_id(name), mapel:mata_pelajaran_id(nama)", { count: "exact" }), context.userId, (roles ?? []).map(r => r.role), data.recap);
    if (data.from) q = q.gte("tanggal", data.from);
    if (data.to) q = q.lte("tanggal", data.to);
    if (data.rombelId) q = q.eq("rombel_id", data.rombelId);
    const { data: rows, error, count } = await q.order("tanggal", { ascending: false }).order("created_at", { ascending: false }).range((data.page - 1) * 20, data.page * 20 - 1);
    if (error) throw new Error(error.message);
    const ownerIds = [...new Set((rows ?? []).map(r => r.created_by))];
    const owners = ownerIds.length ? await context.supabase.from("profiles").select("id, full_name").in("id", ownerIds) : { data: [] };
    return { rows: (rows ?? []).map(r => ({ ...r, owner_name: owners.data?.find(o => o.id === r.created_by)?.full_name ?? "—" })), count: count ?? 0 };
  });

export const pjjDetail = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("pjj_reports").select("*, rombel:rombel_id(name), mapel:mata_pelajaran_id(nama)").eq("id", data.id).single();
    if (error) throw new Error("Laporan tidak ditemukan atau tidak dapat diakses");
    const urls = await Promise.all([row.bukti_instruksi_path, row.bukti_terkumpul_path].map(path => context.supabase.storage.from("pjj-bukti").createSignedUrl(path, 600)));
    if (urls.some(r => r.error)) throw new Error("Gagal membaca bukti foto");
    return { ...row, instruksi_url: urls[0]?.data?.signedUrl ?? "", terkumpul_url: urls[1]?.data?.signedUrl ?? "" };
  });

export const savePjj = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid().optional(), tanggal: z.string().date(), guruId: z.string().uuid(), rombelId: z.string().uuid(), mapelId: z.string().uuid(), jamList: z.array(z.number().int().min(1).max(9)).min(1), tujuan: z.string().max(2000), materi: z.string().trim().min(1).max(4000), muridIds: z.array(z.string().uuid()), instruksiPath: z.string().min(1, "Bukti instruksi tugas wajib diunggah"), terkumpulPath: z.string().min(1, "Bukti tugas terkumpul wajib diunggah"), ttd: z.string().max(500000).default("") }).parse)
  .handler(async ({ context, data }) => {
    const options = await getOptions(context);
    if (!options.rombel.some(r => r.id === data.rombelId) || !options.mapel.some(r => r.id === data.mapelId)) throw new Error("Rombel atau mata pelajaran tidak dapat diakses");
    const teacher = await context.supabase.from("guru").select("id, nip").eq("id", data.guruId).maybeSingle();
    const profile = await context.supabase.from("profiles").select("nip").eq("id", context.userId).maybeSingle();
    if (teacher.error || profile.error || !teacher.data || (!options.isAdmin && (!profile.data?.nip || profile.data.nip !== teacher.data.nip))) throw new Error("Guru tidak dapat diakses");
    const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date(`${data.tanggal}T00:00:00Z`).getUTCDay()];
    const scheduled = await context.supabase.from("jadwal_pelajaran").select("rombel_id, mata_pelajaran_id, jam_ke, kelompok_belajar_id").eq("guru_id", data.guruId).eq("hari", hari);
    if (scheduled.error) throw new Error("Gagal membaca jadwal guru");
    const slots = (scheduled.data ?? []).filter(r => !r.kelompok_belajar_id);
    const periods = slots.filter(r => r.rombel_id === data.rombelId && r.mata_pelajaran_id === data.mapelId).map(r => Number(r.jam_ke));
    if (!matchesPjjSchedule([{ rombel_id: data.rombelId, mata_pelajaran_id: data.mapelId, jam_list: periods, is_kelompok: false }], data.rombelId, data.mapelId, data.jamList)) throw new Error("Kelas dan jam tidak sesuai jadwal guru pada tanggal ini");
    for (const path of [data.instruksiPath, data.terkumpulPath]) {
      if (!path.startsWith(`${context.userId}/`) || path.includes("..")) throw new Error("Bukti foto harus milik akun sendiri");
      const check = await context.supabase.storage.from("pjj-bukti").createSignedUrl(path, 60);
      if (check.error) throw new Error("Bukti foto belum tersedia");
    }
    const ids = [...new Set(data.muridIds)];
    const students = ids.length ? await context.supabase.from("students").select("id, name, nis").eq("rombel_id", data.rombelId).in("id", ids) : { data: [], error: null };
    if (students.error || students.data?.length !== ids.length) throw new Error("Daftar murid tidak sesuai rombel");
    const semester = await context.supabase.from("semester").select("id").eq("is_active", true).maybeSingle();
    const payload = { created_by: context.userId, tanggal: data.tanggal, rombel_id: data.rombelId, mata_pelajaran_id: data.mapelId, jam_list: [...new Set(data.jamList)].sort((a,b) => a-b), tujuan_pembelajaran: data.tujuan, materi: data.materi, murid_aktif: students.data ?? [], bukti_instruksi_path: data.instruksiPath, bukti_terkumpul_path: data.terkumpulPath, ttd_guru: data.ttd, semester_id: semester.data?.id ?? null };
    const result = data.id ? await context.supabase.from("pjj_reports").update(payload).eq("id", data.id).eq("created_by", context.userId).select("id").single() : await context.supabase.from("pjj_reports").insert(payload).select("id").single();
    if (result.error) throw new Error("Gagal menyimpan laporan PJJ");
    return result.data;
  });

export const deletePjj = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const result = await context.supabase.from("pjj_reports").delete().eq("id", data.id).eq("created_by", context.userId).select("id").single();
    if (result.error) throw new Error("Gagal menghapus laporan milik akun sendiri");
    return { ok: true };
  });