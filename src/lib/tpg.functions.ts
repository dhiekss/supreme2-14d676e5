import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { hitungPerkiraanTpg, resolveGajiEfektif, sortKenaikan, type KenaikanGajiRow } from "@/lib/tpg-gaji";
import { todayWIB } from "@/lib/wib";

export const listGuru = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("guru")
      .select("id, nama, nip")
      .order("nama");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listReferensi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("referensi_tpg")
      .select("id, guru_id, pangkat_golongan, gaji_pokok, besaran_pajak, besaran_bpjs, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const ids = [...new Set(rows.map((r: any) => r.guru_id).filter(Boolean))];
    const gMap = new Map<string, any>();
    if (ids.length) {
      const { data: g } = await context.supabase.from("guru").select("id, nama, nip").in("id", ids);
      (g ?? []).forEach((x: any) => gMap.set(x.id, x));
    }
    const refIds = rows.map((r: any) => r.id);
    const kMap = new Map<string, KenaikanGajiRow[]>();
    if (refIds.length) {
      const { data: kn } = await context.supabase
        .from("referensi_tpg_kenaikan")
        .select("id, referensi_tpg_id, gaji_pokok, tanggal_berlaku, catatan, created_at")
        .in("referensi_tpg_id", refIds)
        .order("tanggal_berlaku", { ascending: true });
      (kn ?? []).forEach((k: any) => {
        const arr = kMap.get(k.referensi_tpg_id) ?? [];
        arr.push(k as KenaikanGajiRow);
        kMap.set(k.referensi_tpg_id, arr);
      });
    }
    const today = todayWIB();
    return rows.map((r: any) => {
      const kenaikan = sortKenaikan(kMap.get(r.id));
      return {
        ...r,
        guru_nama: gMap.get(r.guru_id)?.nama ?? "—",
        guru_nip: gMap.get(r.guru_id)?.nip ?? "—",
        kenaikan,
        gaji_efektif: resolveGajiEfektif(r.gaji_pokok, kenaikan, today),
      };
    });
  });

export const upsertReferensi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      guru_id: z.string().uuid(),
      pangkat_golongan: z.string().optional().nullable(),
      gaji_pokok: z.number().int().min(0),
      besaran_pajak: z.number().int().min(0),
      besaran_bpjs: z.number().int().min(0),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      guru_id: data.guru_id,
      pangkat_golongan: data.pangkat_golongan ?? null,
      gaji_pokok: data.gaji_pokok,
      besaran_pajak: data.besaran_pajak,
      besaran_bpjs: data.besaran_bpjs,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await context.supabase.from("referensi_tpg").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("referensi_tpg").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteReferensi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("referensi_tpg").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addKenaikan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      referensi_tpg_id: z.string().uuid(),
      gaji_pokok: z.number().int().min(0),
      tanggal_berlaku: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
      catatan: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("referensi_tpg_kenaikan").insert({
      referensi_tpg_id: data.referensi_tpg_id,
      gaji_pokok: data.gaji_pokok,
      tanggal_berlaku: data.tanggal_berlaku,
      catatan: data.catatan ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteKenaikan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("referensi_tpg_kenaikan").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLaporan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      bulan: z.number().int().optional(),
      tahun: z.number().int().optional(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("laporan_tpg")
      .select("id, guru_id, referensi_tpg_id, bulan, tahun, nominal_diterima, bukti_transfer_url, created_at")
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false });
    if (data.bulan) q = q.eq("bulan", data.bulan);
    if (data.tahun) q = q.eq("tahun", data.tahun);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r: any) => r.guru_id).filter(Boolean))];
    const gMap = new Map<string, any>();
    if (ids.length) {
      const { data: g } = await context.supabase.from("guru").select("id, nama, nip").in("id", ids);
      (g ?? []).forEach((x: any) => gMap.set(x.id, x));
    }
    // Gaji dasar per laporan: cocokkan dengan gaji yang berlaku pada periode bulan/tahun baris tsb.
    const refIds = [...new Set((rows ?? []).map((r: any) => r.referensi_tpg_id).filter(Boolean))] as string[];
    const refMap = new Map<string, { gaji_pokok: number; kenaikan: KenaikanGajiRow[] }>();
    if (refIds.length) {
      const { data: refs } = await context.supabase.from("referensi_tpg").select("id, gaji_pokok").in("id", refIds);
      (refs ?? []).forEach((x: any) => refMap.set(x.id, { gaji_pokok: x.gaji_pokok, kenaikan: [] }));
      const { data: kn } = await context.supabase
        .from("referensi_tpg_kenaikan")
        .select("id, referensi_tpg_id, gaji_pokok, tanggal_berlaku, catatan")
        .in("referensi_tpg_id", refIds);
      (kn ?? []).forEach((k: any) => refMap.get(k.referensi_tpg_id)?.kenaikan.push(k as KenaikanGajiRow));
    }
    return (rows ?? []).map((r: any) => {
      const ref = r.referensi_tpg_id ? refMap.get(r.referensi_tpg_id) : undefined;
      const periode = `${r.tahun}-${String(r.bulan).padStart(2, "0")}-01`;
      return {
        ...r,
        guru_nama: gMap.get(r.guru_id)?.nama ?? "—",
        guru_nip: gMap.get(r.guru_id)?.nip ?? "—",
        gaji_dasar: ref ? resolveGajiEfektif(ref.gaji_pokok, ref.kenaikan, periode) : null,
      };
    });
  });

export const upsertLaporan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      guru_id: z.string().uuid(),
      referensi_tpg_id: z.string().uuid().optional().nullable(),
      bulan: z.number().int().min(1).max(12),
      tahun: z.number().int().min(2000).max(2100),
      nominal_diterima: z.number().int().min(0),
      bukti_transfer_url: z.string().optional().nullable(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    // Non-admin hanya boleh melaporkan untuk dirinya sendiri (guru yang terhubung via NIP profil).
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("superadmin");
    let guruId = data.guru_id;
    if (!isAdmin) {
      const { data: prof } = await context.supabase.from("profiles").select("nip").eq("id", context.userId).maybeSingle();
      let ownId: string | null = null;
      if (prof?.nip) {
        const { data: g } = await context.supabase.from("guru").select("id").eq("nip", prof.nip).maybeSingle();
        ownId = g?.id ?? null;
      }
      if (!ownId) throw new Error("Akun Anda belum terhubung dengan data guru. Hubungi admin.");
      guruId = ownId;
    }
    const payload: any = {
      guru_id: guruId,
      referensi_tpg_id: data.referensi_tpg_id ?? null,
      bulan: data.bulan,
      tahun: data.tahun,
      nominal_diterima: data.nominal_diterima,
      bukti_transfer_url: data.bukti_transfer_url ?? null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("laporan_tpg").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("laporan_tpg").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteLaporan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("laporan_tpg").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Daftar administrasi mencakup SEMUA guru per periode, termasuk yang belum melapor TPG.
export const listAdministrasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ bulan: z.number().int().optional(), tahun: z.number().int().optional() }).parse,
  )
  .handler(async ({ context, data }) => {
    const tahun = data.tahun ?? new Date().getFullYear();

    let qLap = context.supabase
      .from("laporan_tpg")
      .select("id, guru_id, bulan, tahun, nominal_diterima, bukti_transfer_url, created_at")
      .eq("tahun", tahun);
    let qAdm = context.supabase
      .from("tpg_administrasi")
      .select("id, guru_id, laporan_tpg_id, bulan, tahun, sudah_administrasi, nominal_iuran, tanggal_administrasi")
      .eq("tahun", tahun);
    if (data.bulan) {
      qLap = qLap.eq("bulan", data.bulan);
      qAdm = qAdm.eq("bulan", data.bulan);
    }
    const [{ data: gurus, error: gErr }, { data: laps, error: lErr }, { data: adms, error: aErr }, { data: roleRows }] =
      await Promise.all([
        context.supabase.from("guru").select("id, nama, nip").order("nama"),
        qLap,
        qAdm,
        context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      ]);
    if (gErr) throw new Error(gErr.message);
    if (lErr) throw new Error(lErr.message);
    if (aErr) throw new Error(aErr.message);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("superadmin") || roles.includes("admin_tpg");

    // Periode dalam cakupan: bulan terpilih, atau semua periode yang punya laporan/administrasi tahun ini.
    const periods: { bulan: number; tahun: number }[] = [];
    if (data.bulan) {
      periods.push({ bulan: data.bulan, tahun });
    } else {
      const set = new Map<string, { bulan: number; tahun: number }>();
      [...(laps ?? []), ...(adms ?? [])].forEach((r: any) => {
        set.set(`${r.tahun}-${r.bulan}`, { bulan: r.bulan, tahun: r.tahun });
      });
      periods.push(...set.values());
    }
    periods.sort((a, b) => b.tahun - a.tahun || b.bulan - a.bulan);

    const key = (g: string, b: number, t: number) => `${g}|${b}|${t}`;
    const lapMap = new Map<string, any>();
    (laps ?? []).forEach((l: any) => {
      const k = key(l.guru_id, l.bulan, l.tahun);
      const prev = lapMap.get(k);
      if (!prev || new Date(l.created_at) > new Date(prev.created_at)) lapMap.set(k, l);
    });
    const admMap = new Map<string, any>();
    (adms ?? []).forEach((a: any) => admMap.set(key(a.guru_id, a.bulan, a.tahun), a));

    const rows: any[] = [];
    for (const p of periods) {
      for (const g of gurus ?? []) {
        const lap = lapMap.get(key(g.id, p.bulan, p.tahun)) ?? null;
        const adm = admMap.get(key(g.id, p.bulan, p.tahun)) ?? null;
        rows.push({
          id: adm?.id ?? null,
          guru_id: g.id,
          bulan: p.bulan,
          tahun: p.tahun,
          sudah_administrasi: adm?.sudah_administrasi ?? false,
          nominal_iuran: adm?.nominal_iuran ?? 0,
          tanggal_administrasi: adm?.tanggal_administrasi ?? null,
          guru_nama: g.nama ?? "—",
          guru_nip: g.nip ?? "—",
          sudah_lapor: !!lap,
          laporan_id: lap?.id ?? null,
          laporan_nominal: lap?.nominal_diterima ?? null,
          laporan_bukti: lap?.bukti_transfer_url ?? null,
          laporan_created_at: lap?.created_at ?? null,
        });
      }
    }
    return { is_admin: isAdmin, rows };
  });

// Admin (admin/superadmin/admin_tpg) menandai status administrasi + nominal iuran per baris.
// Bisa membuat baris baru untuk guru yang belum melapor (tanpa id, pakai guru_id+bulan+tahun).
export const upsertAdministrasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      guru_id: z.string().uuid().optional(),
      bulan: z.number().int().min(1).max(12).optional(),
      tahun: z.number().int().min(2000).max(2100).optional(),
      sudah_administrasi: z.boolean(),
      nominal_iuran: z.number().int().min(0),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("superadmin") && !roles.includes("admin_tpg")) {
      throw new Error("Hanya admin TPG yang dapat mengubah administrasi.");
    }
    const payload = {
      sudah_administrasi: data.sudah_administrasi,
      nominal_iuran: data.nominal_iuran,
      tanggal_administrasi: data.sudah_administrasi ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await context.supabase.from("tpg_administrasi").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (!data.guru_id || !data.bulan || !data.tahun) {
      throw new Error("Data guru dan periode wajib diisi.");
    }
    // Tautkan ke laporan TPG guru pada periode ini bila ada.
    const { data: lap } = await context.supabase
      .from("laporan_tpg")
      .select("id")
      .eq("guru_id", data.guru_id)
      .eq("bulan", data.bulan)
      .eq("tahun", data.tahun)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await context.supabase.from("tpg_administrasi").insert({
      ...payload,
      guru_id: data.guru_id,
      bulan: data.bulan,
      tahun: data.tahun,
      laporan_tpg_id: lap?.id ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPenyerahanIuran = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ bulan: z.number().int().optional(), tahun: z.number().int().optional() }).parse,
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("tpg_penyerahan_iuran")
      .select("id, bulan, tahun, keperluan, nominal, tanggal_penyerahan")
      .order("tanggal_penyerahan", { ascending: false });
    if (data.bulan) q = q.eq("bulan", data.bulan);
    if (data.tahun) q = q.eq("tahun", data.tahun);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Statistik penyerahan iuran: iuran wilayah = 20% dari total iuran, sisanya (80%) iuran sekolah.
export const getPenyerahanIuranStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ bulan: z.number().int().optional(), tahun: z.number().int().optional() }).parse,
  )
  .handler(async ({ context, data }) => {
    let qLap = context.supabase.from("laporan_tpg").select("id", { count: "exact", head: true });
    let qAdm = context.supabase.from("tpg_administrasi").select("sudah_administrasi, nominal_iuran");
    let qPen = context.supabase.from("tpg_penyerahan_iuran").select("nominal");
    if (data.bulan) {
      qLap = qLap.eq("bulan", data.bulan);
      qAdm = qAdm.eq("bulan", data.bulan);
      qPen = qPen.eq("bulan", data.bulan);
    }
    if (data.tahun) {
      qLap = qLap.eq("tahun", data.tahun);
      qAdm = qAdm.eq("tahun", data.tahun);
      qPen = qPen.eq("tahun", data.tahun);
    }
    const [lap, adm, pen] = await Promise.all([qLap, qAdm, qPen]);
    if (lap.error) throw new Error(lap.error.message);
    if (adm.error) throw new Error(adm.error.message);
    if (pen.error) throw new Error(pen.error.message);

    const totalLaporan = lap.count ?? 0;
    const admRows = adm.data ?? [];
    const sudah = admRows.filter((r: any) => r.sudah_administrasi).length;
    const totalIuran = admRows.reduce((s: number, r: any) => s + Number(r.nominal_iuran ?? 0), 0);
    const totalTersalur = (pen.data ?? []).reduce((s: number, r: any) => s + Number(r.nominal ?? 0), 0);

    const iuranWilayah = Math.round(totalIuran * 0.2);
    const iuranSekolah = totalIuran - iuranWilayah;
    const wilayahTersalur = Math.round(totalTersalur * 0.2);
    const sekolahTersalur = totalTersalur - wilayahTersalur;

    return {
      total_laporan: totalLaporan,
      sudah_administrasi: sudah,
      belum_administrasi: Math.max(totalLaporan - sudah, 0),
      iuran_sekolah: iuranSekolah,
      iuran_wilayah: iuranWilayah,
      total_iuran: totalIuran,
      sekolah_tersalur: sekolahTersalur,
      wilayah_tersalur: wilayahTersalur,
      total_tersalur: totalTersalur,
      sisa_sekolah: iuranSekolah - sekolahTersalur,
      sisa_wilayah: iuranWilayah - wilayahTersalur,
      total_sisa: totalIuran - totalTersalur,
    };
  });

export const listPeriodeAktif = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data, error }, { data: roleRows }] = await Promise.all([
      context.supabase
        .from("tpg_periode_aktif")
        .select("id, bulan, tahun, is_active, created_at")
        .order("tahun", { ascending: false })
        .order("bulan", { ascending: false }),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    if (error) throw new Error(error.message);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    return { rows: data ?? [], is_admin: roles.includes("admin") || roles.includes("superadmin") };
  });

export const addPeriodeAktif = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ bulan: z.number().int().min(1).max(12), tahun: z.number().int().min(2000).max(2100) }).parse,
  )
  .handler(async ({ context, data }) => {
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("superadmin")) {
      throw new Error("Hanya admin yang dapat mengelola periode pelaporan.");
    }
    const { data: dup } = await context.supabase
      .from("tpg_periode_aktif")
      .select("id")
      .eq("bulan", data.bulan)
      .eq("tahun", data.tahun)
      .maybeSingle();
    if (dup) throw new Error("Periode tersebut sudah ada.");
    const { error } = await context.supabase
      .from("tpg_periode_aktif")
      .insert({ bulan: data.bulan, tahun: data.tahun, is_active: true, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPeriodeAktifStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse)
  .handler(async ({ context, data }) => {
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("superadmin")) {
      throw new Error("Hanya admin yang dapat mengelola periode pelaporan.");
    }
    const { error } = await context.supabase
      .from("tpg_periode_aktif")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePeriodeAktif = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("superadmin")) {
      throw new Error("Hanya admin yang dapat mengelola periode pelaporan.");
    }
    const { error } = await context.supabase.from("tpg_periode_aktif").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Dashboard Lapor TPG: data guru + referensi + riwayat laporan untuk satu guru.
// Non-admin dipaksa ke guru miliknya sendiri (dari NIP profil); admin boleh memilih guru mana pun.
export const getLaporanTpgDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ guru_id: z.string().uuid().optional() }).parse)
  .handler(async ({ context, data }) => {
    const uid = context.userId;
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      context.supabase.from("profiles").select("nip").eq("id", uid).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("superadmin");
    let ownGuru: any = null;
    if (prof?.nip) {
      const { data: g } = await context.supabase
        .from("guru")
        .select("id, nama, nip")
        .eq("nip", prof.nip)
        .maybeSingle();
      ownGuru = g ?? null;
    }
    const guruId = isAdmin && data.guru_id ? data.guru_id : (ownGuru?.id ?? null);
    if (!guruId) return { is_admin: isAdmin, own_guru: ownGuru, guru: null, referensi: null, laporan: [] as any[] };

    const { data: guru } = await context.supabase
      .from("guru")
      .select("id, nama, nip")
      .eq("id", guruId)
      .maybeSingle();

    const { data: refs } = await context.supabase
      .from("referensi_tpg")
      .select("id, guru_id, pangkat_golongan, gaji_pokok, besaran_pajak, besaran_bpjs, updated_at")
      .eq("guru_id", guruId)
      .order("updated_at", { ascending: false });
    const refList = refs ?? [];
    const refIds = refList.map((r: any) => r.id);
    const kMap = new Map<string, KenaikanGajiRow[]>();
    if (refIds.length) {
      const { data: kn } = await context.supabase
        .from("referensi_tpg_kenaikan")
        .select("id, referensi_tpg_id, gaji_pokok, tanggal_berlaku, catatan")
        .in("referensi_tpg_id", refIds)
        .order("tanggal_berlaku", { ascending: true });
      (kn ?? []).forEach((k: any) => {
        const arr = kMap.get(k.referensi_tpg_id) ?? [];
        arr.push(k as KenaikanGajiRow);
        kMap.set(k.referensi_tpg_id, arr);
      });
    }
    const ref = refList[0] ?? null;
    const today = todayWIB();
    const referensi = ref
      ? {
          ...ref,
          kenaikan: sortKenaikan(kMap.get(ref.id)),
          gaji_efektif: resolveGajiEfektif(ref.gaji_pokok, kMap.get(ref.id), today),
        }
      : null;

    const { data: laps, error } = await context.supabase
      .from("laporan_tpg")
      .select("id, guru_id, referensi_tpg_id, bulan, tahun, nominal_diterima, bukti_transfer_url, created_at")
      .eq("guru_id", guruId)
      .order("tahun", { ascending: false })
      .order("bulan", { ascending: false });
    if (error) throw new Error(error.message);

    const laporan = (laps ?? []).map((r: any) => {
      const rRef = refList.find((x: any) => x.id === r.referensi_tpg_id) ?? ref;
      let perkiraan: number | null = null;
      if (rRef) {
        const periode = `${r.tahun}-${String(r.bulan).padStart(2, "0")}-01`;
        const gaji = resolveGajiEfektif(rRef.gaji_pokok, kMap.get(rRef.id), periode);
        perkiraan = hitungPerkiraanTpg(gaji, rRef.besaran_pajak, rRef.besaran_bpjs);
      }
      return { ...r, perkiraan };
    });

    return { is_admin: isAdmin, own_guru: ownGuru, guru, referensi, laporan };
  });

// Signed URL untuk bukti transfer di bucket privat "tpg-bukti".
export const signTpgBukti = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("tpg-bukti")
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed?.signedUrl ?? null };
  });
