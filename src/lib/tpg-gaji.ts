import { todayWIB } from "@/lib/wib";

export interface KenaikanGajiRow {
  id: string;
  referensi_tpg_id?: string;
  gaji_pokok: number;
  tanggal_berlaku: string; // YYYY-MM-DD
  catatan: string | null;
  created_at?: string;
}

/** Urutkan riwayat kenaikan berdasarkan tanggal berlaku (lama -> baru). */
export function sortKenaikan(kenaikan: KenaikanGajiRow[] | undefined | null): KenaikanGajiRow[] {
  return (kenaikan ?? []).slice().sort((a, b) => a.tanggal_berlaku.localeCompare(b.tanggal_berlaku));
}

/**
 * Gaji pokok efektif pada tanggal tertentu.
 * Dasar = gaji pokok awal referensi; setiap kenaikan dengan tanggal_berlaku <= `pada`
 * menggantikan nilai sebelumnya. Riwayat periode lalu otomatis memakai gaji lama.
 */
export function resolveGajiEfektif(
  gajiAwal: number | null | undefined,
  kenaikan: KenaikanGajiRow[] | undefined | null,
  pada: string, // YYYY-MM-DD
): number {
  let gaji = Number(gajiAwal ?? 0);
  for (const k of sortKenaikan(kenaikan)) {
    if (k.tanggal_berlaku <= pada) gaji = Number(k.gaji_pokok);
  }
  return gaji;
}

/** Gaji efektif hari ini (WIB). */
export function gajiEfektifHariIni(
  gajiAwal: number | null | undefined,
  kenaikan: KenaikanGajiRow[] | undefined | null,
): number {
  return resolveGajiEfektif(gajiAwal, kenaikan, todayWIB());
}

export type StatusKenaikan = "berlaku" | "terjadwal" | "riwayat";

/** Status satu baris riwayat: Berlaku (efektif terbaru hari ini), Terjadwal (TMT di masa depan), Riwayat (sudah tergantikan). */
export function statusKenaikan(row: KenaikanGajiRow, kenaikan: KenaikanGajiRow[]): StatusKenaikan {
  const today = todayWIB();
  if (row.tanggal_berlaku > today) return "terjadwal";
  const berlaku = sortKenaikan(kenaikan).filter((k) => k.tanggal_berlaku <= today);
  const current = berlaku[berlaku.length - 1];
  return current && current.id === row.id ? "berlaku" : "riwayat";
}

/** Format YYYY-MM-DD -> "5 Agu 2026" (id-ID). */
export function fmtTanggal(ymd: string | null | undefined): string {
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00Z`);
  if (isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}
