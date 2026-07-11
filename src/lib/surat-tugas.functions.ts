import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listSuratTugas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("surat_tugas")
      .select(
        "id, surat_keluar_id, nomor_surat, jenis, tanggal_mulai, tanggal_selesai, tujuan_lokasi, keperluan, kendaraan, waktu_berangkat, kode_kegiatan, kode_ring, dasar_surat_ada, nomor_dasar_surat, tanggal_dasar_surat, perihal_dasar_surat, instansi_dasar_surat, status, file_surat_tugas_url, file_sppd_url, created_at",
      )
      .order("tanggal_mulai", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(0, 4999);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r: any) => r.id);
    let peserta: any[] = [];
    if (ids.length) {
      const { data: p, error: pe } = await context.supabase
        .from("surat_tugas_peserta")
        .select("id, surat_tugas_id, nama_peserta, nip, jabatan, pangkat_golongan, urutan, is_utama")
        .in("surat_tugas_id", ids)
        .order("urutan", { ascending: true });
      if (pe) throw new Error(pe.message);
      peserta = p ?? [];
    }
    return (data ?? []).map((r: any) => ({
      ...r,
      peserta: peserta.filter((p) => p.surat_tugas_id === r.id),
    }));
  });

export const listGuruLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: guru, error }, { data: ref }] = await Promise.all([
      context.supabase.from("guru").select("id, nama, nip").order("nama"),
      context.supabase.from("referensi_tpg").select("guru_id, pangkat_golongan"),
    ]);
    if (error) throw new Error(error.message);
    const map = new Map<string, string>();
    (ref ?? []).forEach((r: any) => { if (r.guru_id) map.set(r.guru_id, r.pangkat_golongan ?? ""); });
    return (guru ?? []).map((g: any) => ({ ...g, pangkat_golongan: map.get(g.id) ?? "" }));
  });

const PesertaInput = z.object({
  nama_peserta: z.string().trim().min(1).max(255),
  nip: z.string().trim().max(50).optional().nullable(),
  jabatan: z.string().trim().max(255).optional().nullable(),
  pangkat_golongan: z.string().trim().max(100).optional().nullable(),
  is_utama: z.boolean().optional(),
});

const TujuanInput = z.object({
  nama: z.string().trim().min(1).max(255),
  kabupaten: z.string().trim().max(255).optional().nullable(),
  alamat: z.string().trim().max(500).optional().nullable(),
});

const SuratTugasInput = z.object({
  id: z.string().uuid().optional(),
  surat_keluar_id: z.string().uuid().optional().nullable(),
  kode_surat: z.string().default("805"),
  nomor_urut: z.number().int().min(1).max(999999),
  nomor_surat: z.string().trim().min(1).max(255),
  tanggal_surat: z.string().min(1),
  kode_kegiatan: z.string().trim().max(50).optional().nullable(),
  kode_ring: z.string().trim().max(50).optional().nullable(),
  dasar_surat_ada: z.boolean().optional(),
  nomor_dasar_surat: z.string().trim().max(255).optional().nullable(),
  tanggal_dasar_surat: z.string().optional().nullable(),
  perihal_dasar_surat: z.string().trim().max(500).optional().nullable(),
  instansi_dasar_surat: z.string().trim().max(255).optional().nullable(),
  keperluan: z.string().trim().min(1).max(2000),
  waktu_berangkat: z.string().optional().nullable(),
  tanggal_mulai: z.string().min(1),
  tanggal_selesai: z.string().min(1),
  kendaraan: z.string().trim().max(50).optional().nullable(),
  status: z.string().max(30).optional().nullable(),
  tujuan_list: z.array(TujuanInput).min(1).max(2),
  peserta: z.array(PesertaInput).min(1).max(3),
  reserved_id: z.string().uuid().optional().nullable(),
});

export const saveSuratTugas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(SuratTugasInput.parse)
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const tujuanText = data.tujuan_list
      .map((t) => [t.nama, t.kabupaten].filter(Boolean).join(", "))
      .join(" | ");
    const alamatText = data.tujuan_list.map((t) => t.alamat).filter(Boolean).join(" | ");

    const skPayload: any = {
      kode_surat: data.kode_surat || "805",
      nomor_urut: data.nomor_urut,
      nomor_surat: data.nomor_surat,
      tanggal_surat: data.tanggal_surat,
      tujuan: tujuanText,
      perihal: data.keperluan,
      jenis_surat: "Surat Tugas & SPPD",
      sifat_surat: "Biasa",
      isi_ringkas: [data.keperluan, alamatText].filter(Boolean).join("\n"),
      status: data.status ?? "aktif",
    };

    let surat_keluar_id = data.surat_keluar_id ?? null;
    let surat_tugas_id = data.id ?? null;

    if (data.id) {
      if (surat_keluar_id) {
        const { error } = await sb.from("surat_keluar").update(skPayload).eq("id", surat_keluar_id);
        if (error) throw new Error(error.message);
      }
    } else {
      skPayload.pembuat_id = context.userId;
      const { data: ins, error } = await sb.from("surat_keluar").insert(skPayload).select("id").single();
      if (error) throw new Error(error.message);
      surat_keluar_id = ins?.id;

      // Sinkron counter pengaturan (jenis surat_keluar)
      const tahun = new Date(data.tanggal_surat).getFullYear();
      const { data: setting } = await sb
        .from("persuratan_nomor_surat")
        .select("id, counter, format_nomor, prefix")
        .eq("jenis_surat", "surat_keluar")
        .eq("tahun", tahun)
        .maybeSingle();
      if (setting?.id && data.nomor_urut > (setting.counter ?? 0)) {
        const padded = String(data.nomor_urut).padStart(3, "0");
        const contoh = (setting.format_nomor ?? "")
          .replaceAll("{KODE}", data.kode_surat)
          .replaceAll("{NOMOR}", padded)
          .replaceAll("{TAHUN}", String(tahun))
          .replaceAll("{kode}", data.kode_surat)
          .replaceAll("{counter}", padded)
          .replaceAll("{prefix}", setting.prefix ?? "")
          .replaceAll("{tahun}", String(tahun));
        await sb
          .from("persuratan_nomor_surat")
          .update({ counter: data.nomor_urut, contoh_hasil: contoh })
          .eq("id", setting.id);
      }
    }

    // Trigger sudah membuat stub surat_tugas via surat_keluar_id; update dgn detail lengkap
    const stPayload: any = {
      surat_keluar_id,
      nomor_surat: data.nomor_surat,
      jenis: "Surat Tugas",
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai,
      tujuan_lokasi: tujuanText,
      keperluan: data.keperluan,
      kode_kegiatan: data.kode_kegiatan ?? null,
      kode_ring: data.kode_ring ?? null,
      dasar_surat_ada: data.dasar_surat_ada ?? false,
      nomor_dasar_surat: data.nomor_dasar_surat ?? null,
      tanggal_dasar_surat: data.tanggal_dasar_surat || null,
      perihal_dasar_surat: data.perihal_dasar_surat ?? null,
      instansi_dasar_surat: data.instansi_dasar_surat ?? null,
      waktu_berangkat: data.waktu_berangkat || null,
      kendaraan: data.kendaraan ?? "Roda 4",
      status: data.status ?? "aktif",
    };

    if (surat_tugas_id) {
      const { error } = await sb.from("surat_tugas").update(stPayload).eq("id", surat_tugas_id);
      if (error) throw new Error(error.message);
    } else {
      // ambil id yg dibuat trigger
      const { data: existing } = await sb
        .from("surat_tugas")
        .select("id")
        .eq("surat_keluar_id", surat_keluar_id)
        .maybeSingle();
      if (existing?.id) {
        surat_tugas_id = existing.id;
        const { error } = await sb.from("surat_tugas").update(stPayload).eq("id", surat_tugas_id);
        if (error) throw new Error(error.message);
      } else {
        stPayload.pembuat_id = context.userId;
        const { data: stIns, error } = await sb.from("surat_tugas").insert(stPayload).select("id").single();
        if (error) throw new Error(error.message);
        surat_tugas_id = stIns?.id;
      }
    }

    // Replace peserta
    if (surat_tugas_id) {
      await sb.from("surat_tugas_peserta").delete().eq("surat_tugas_id", surat_tugas_id);
      const pesertaPayload = data.peserta.map((p, i) => ({
        surat_tugas_id,
        nama_peserta: p.nama_peserta,
        nip: p.nip ?? null,
        jabatan: p.jabatan ?? null,
        pangkat_golongan: p.pangkat_golongan ?? null,
        urutan: i + 1,
        is_utama: i === 0,
      }));
      if (pesertaPayload.length) {
        const { error } = await sb.from("surat_tugas_peserta").insert(pesertaPayload);
        if (error) throw new Error(error.message);
      }
    }

    if (data.reserved_id && surat_keluar_id) {
      await sb
        .from("persuratan_nomor_diamankan")
        .update({ status: "digunakan", used_by_surat_id: surat_keluar_id })
        .eq("id", data.reserved_id);
    }

    return { ok: true, id: surat_tugas_id, surat_keluar_id };
  });

export const deleteSuratTugas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const sb = context.supabase as any;
    const { data: row } = await sb.from("surat_tugas").select("surat_keluar_id").eq("id", data.id).maybeSingle();
    // Hapus surat_keluar (cascade akan menghapus surat_tugas), atau surat_tugas saja
    if (row?.surat_keluar_id) {
      const { error } = await sb.from("surat_keluar").delete().eq("id", row.surat_keluar_id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("surat_tugas").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
