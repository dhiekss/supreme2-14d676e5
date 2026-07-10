import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BACKUP_TABLES = [
  "app_settings",
  "tahun_ajaran",
  "semester",
  "konsentrasi_keahlian",
  "mata_pelajaran",
  "rombel",
  "rombel_mata_pelajaran",
  "user_rombel",
  "profiles",
  "user_roles",
  "user_menu_permissions",
  "user_presence",
  "guru",
  "students",
  "verval_siswa",
  "student_resignations",
  "student_transfers_out",
  "student_rombel_transfers",
  "hari_efektif",
  "jadwal_alokasi_waktu",
  "jadwal_pelajaran",
  "attendance_records",
  "attendance_details",
  "attendance_revision_requests",
  "late_records",
  "guru_izin",
  "guru_izin_tugas",
  "kbm_records",
  "kbm_agenda",
  "kbm_agenda_kehadiran",
  "tujuan_pembelajaran",
  "berkas_pembelajaran",
  "nilai_siswa",
  "kurator_pembelajaran",
  "books",
  "book_copies",
  "book_loans",
  "sarpras_jenis_ruang",
  "sarpras_ruang",
  "sarpras_pengajuan",
  "admin_sarpras",
  "persuratan_pengaturan_umum",
  "persuratan_kop_surat",
  "persuratan_kode_surat",
  "persuratan_nomor_surat",
  "surat_keluar",
  "surat_tugas",
  "surat_tugas_peserta",
  "admin_persuratan",
  "referensi_tpg",
  "tpg_periode_aktif",
  "tpg_administrasi",
  "tpg_penyerahan_iuran",
  "laporan_tpg",
  "admin_tpg",
  "sp_records",
  "suara_publik",
  "notification_logs",
  "activity_logs",
  "backup_logs",
] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: hanya admin yang dapat membuat backup");
}

export const exportBackup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables: Record<string, any[]> = {};
    const stats: Record<string, number> = {};
    const errors: Record<string, string> = {};

    for (const table of BACKUP_TABLES) {
      const rows: any[] = [];
      const pageSize = 1000;
      let from = 0;
      let done = false;
      let tableError: string | null = null;
      while (!done) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select("*")
          .range(from, from + pageSize - 1);
        if (error) {
          tableError = error.message;
          break;
        }
        const chunk = data ?? [];
        rows.push(...chunk);
        if (chunk.length < pageSize) done = true;
        else from += pageSize;
      }
      if (tableError) {
        errors[table] = tableError;
        tables[table] = [];
        stats[table] = 0;
      } else {
        tables[table] = rows;
        stats[table] = rows.length;
      }
    }

    const now = new Date().toISOString();
    const totalRows = Object.values(stats).reduce((a, b) => a + b, 0);

    try {
      await supabaseAdmin.from("backup_logs").insert({
        user_id: context.userId,
        action: "export",
        status: Object.keys(errors).length ? "partial" : "success",
        description: `Backup database (${totalRows} baris, ${BACKUP_TABLES.length} tabel)`,
        metadata: { stats, errors },
      } as any);
    } catch {
      // backup_logs may have a different schema; ignore
    }

    return {
      meta: {
        generated_at: now,
        app: "SUPREME XPOES",
        version: 1,
        tables: BACKUP_TABLES.length,
        totalRows,
        stats,
        errors,
      },
      data: tables,
    };
  });

export const importBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const parsed = z
      .object({
        data: z.any(),
        mode: z.enum(["upsert", "insert"]).optional().default("upsert"),
      })
      .parse(raw);

    // Normalize incoming payload into Record<tableName, rows[]>.
    // Supported shapes:
    //   A) { [tableName]: rows[] }
    //   B) { data: { [tableName]: rows[] } }         ← current export
    //   C) { tables: { [tableName]: rows[] } }
    //   D) { tables: Array<{ name, rows }> }         ← alt export
    //   E) Array<{ name|table, rows|data }>
    const src: any = parsed.data;
    let normalized: Record<string, any[]> = {};

    const fromArray = (arr: any[]) => {
      const out: Record<string, any[]> = {};
      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        const name = item.name ?? item.table ?? item.tableName;
        const rows = item.rows ?? item.data ?? item.records;
        if (typeof name === "string" && Array.isArray(rows)) out[name] = rows;
      }
      return out;
    };

    if (Array.isArray(src)) {
      normalized = fromArray(src);
    } else if (src && typeof src === "object") {
      if (src.data && typeof src.data === "object" && !Array.isArray(src.data)) {
        normalized = src.data;
      } else if (Array.isArray(src.tables)) {
        normalized = fromArray(src.tables);
      } else if (src.tables && typeof src.tables === "object") {
        normalized = src.tables;
      } else {
        // Assume shape A: pick keys whose values are arrays
        for (const [k, v] of Object.entries(src)) {
          if (Array.isArray(v)) normalized[k] = v as any[];
        }
      }
    }

    if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
      throw new Error(
        "Format backup tidak dikenali. Diharapkan objek { data: { namaTabel: [...] } } atau { tables: [...] }.",
      );
    }

    return { data: normalized, mode: parsed.mode };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const stats: Record<string, number> = {};
    const errors: Record<string, string> = {};
    let totalInserted = 0;

    // Restore in declared order (respects FK dependencies of BACKUP_TABLES)
    for (const table of BACKUP_TABLES) {
      const rows = data.data[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        stats[table] = 0;
        continue;
      }
      const chunkSize = 500;
      let inserted = 0;
      let tableError: string | null = null;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const query =
          data.mode === "insert"
            ? supabaseAdmin.from(table).insert(chunk as any)
            : supabaseAdmin.from(table).upsert(chunk as any, { onConflict: "id" });
        const { error } = await query;
        if (error) {
          tableError = error.message;
          break;
        }
        inserted += chunk.length;
      }
      if (tableError) {
        errors[table] = tableError;
        stats[table] = inserted;
      } else {
        stats[table] = inserted;
      }
      totalInserted += inserted;
    }

    try {
      await supabaseAdmin.from("backup_logs").insert({
        user_id: context.userId,
        action: "import",
        status: Object.keys(errors).length ? "partial" : "success",
        description: `Impor backup (${totalInserted} baris)`,
        metadata: { stats, errors, mode: data.mode },
      } as any);
    } catch {
      // ignore log errors
    }

    return {
      generated_at: new Date().toISOString(),
      totalInserted,
      tables: Object.keys(stats).length,
      stats,
      errors,
    };
  });

