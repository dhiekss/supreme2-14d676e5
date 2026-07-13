import { jsPDF } from "jspdf";
import {
  addHtmlPageToPdf,
  escapeHtml,
  fmtTanggalId,
  fmtHariTanggalId,
  loadLogoDataUrl,
  KOTA,
} from "./pdf-html-common";

export type PesertaLaporan = {
  nama_peserta?: string | null;
  nip?: string | null;
  jabatan?: string | null;
  pangkat_golongan?: string | null;
  urutan?: number | null;
  is_utama?: boolean | null;
};

export type LaporanSppdPdfData = {
  nomor_surat?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  tujuan_lokasi?: string | null;
  keperluan?: string | null;
  dasar_surat_ada?: boolean | null;
  nomor_dasar_surat?: string | null;
  tanggal_dasar_surat?: string | null;
  perihal_dasar_surat?: string | null;
  instansi_dasar_surat?: string | null;
  peserta?: PesertaLaporan[];
};

function kop(logo: string): string {
  return `
  <table style="width:100%; border-collapse:collapse; margin-bottom:6px; font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="width:110px; vertical-align:middle; text-align:center;">
        <img src="${logo}" style="width:95px; height:auto;" />
      </td>
      <td style="text-align:center; vertical-align:middle; line-height:1.2;">
        <div style="font-size:14px;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</div>
        <div style="font-size:14px;">DINAS PENDIDIKAN</div>
        <div style="font-size:14px;">CABANG DINAS PENDIDIKAN WILAYAH IV</div>
        <div style="font-size:18px; font-weight:bold; margin-top:3px; margin-bottom:3px;">SMK NEGERI 1 PUSAKANAGARA</div>
        <div style="font-size:11px;">Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240</div>
        <div style="font-size:11px;">Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com</div>
        <div style="font-size:11px;">SUBANG - 41255</div>
      </td>
      <td style="width:50px;"></td>
    </tr>
  </table>
  <div style="border-top:3px solid #000; border-bottom:1px solid #000; height:4px; margin-bottom:14px;"></div>
  `;
}


export function buildLaporanSppdHtml(row: LaporanSppdPdfData, logo: string): string {
  const peserta = (row.peserta ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const pelapor = peserta[0];
  const tableCell = "padding:0; vertical-align:middle; line-height:1.15;";
  const tujuanArr = (row.tujuan_lokasi ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  const tujuanList = (tujuanArr.length ? tujuanArr : [""])
    .map((t, i) => `<div style="margin-left:22px;">${i + 1}. ${escapeHtml(t)}</div>`)
    .join("");

  const dasarHtml = row.dasar_surat_ada
    ? `
      <table style="border-collapse:collapse; margin-left:22px; font-size:14px; line-height:1.15; table-layout:fixed;">
        <tr><td style="width:100px; ${tableCell}">a. Dasar Surat</td><td style="width:10px; ${tableCell}">:</td><td style="${tableCell}">${escapeHtml(row.perihal_dasar_surat)}</td></tr>
        <tr><td style="${tableCell}">b. Nomor</td><td style="${tableCell}">:</td><td style="${tableCell}">${escapeHtml(row.nomor_dasar_surat)}</td></tr>
        <tr><td style="${tableCell}">c. Tanggal</td><td style="${tableCell}">:</td><td style="${tableCell}">${fmtTanggalId(row.tanggal_dasar_surat)}</td></tr>
      </table>
    `
    : `<div style="margin-left:22px; font-style:italic;">Tidak ada dasar surat.</div>`;

  const kesimpulanLines = Array.from({ length: 7 })
    .map(() => `<div style="border-bottom:1px solid #000; height:22px;"></div>`)
    .join("");

  const tglTtd = fmtTanggalId(row.tanggal_selesai ?? row.tanggal_mulai);

  return `
  <div style="width:794px; height:1123px; padding:50px 60px; box-sizing:border-box; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#000; line-height:1.15;">
    ${kop(logo)}
    <div style="text-align:center; margin-bottom:2px;">
      <span style="font-size:14px; font-weight:bold; text-decoration:underline;">LAPORAN PERJALANAN DINAS</span>
    </div>
    <div style="text-align:center; margin-bottom:16px;">Nomor: ${escapeHtml(row.nomor_surat)}</div>

    <div style="font-weight:bold; margin-bottom:6px;">A. PENDAHULUAN</div>

    <div>1. Dasar</div>
    ${dasarHtml}

    <div style="margin-top:8px;">2. Tujuan</div>
    <div style="margin-left:22px;">${escapeHtml(row.keperluan)}</div>

    <div style="margin-top:8px;">3. Waktu</div>
    <div style="margin-left:22px;">${fmtHariTanggalId(row.tanggal_mulai, row.tanggal_selesai)}</div>

    <div style="margin-top:8px;">4. Tempat Tujuan</div>
    ${tujuanList}

    <div style="font-weight:bold; margin-top:14px; margin-bottom:6px;">B. PENUTUP</div>

    <div style="margin-bottom:6px;">Kesimpulan :</div>
    ${kesimpulanLines}

    <div style="margin-top:22px; margin-left:52%; font-size:14px;">
      <div>${KOTA}, ${tglTtd}</div>
      <div>Pelapor,</div>
      <div style="height:70px;"></div>
      <div style="font-weight:bold; text-decoration:underline;">${escapeHtml((pelapor?.nama_peserta ?? "").toUpperCase())}</div>
      <div>NIP. ${escapeHtml(pelapor?.nip)}</div>
    </div>
  </div>
  `;
}

export function laporanSppdPdfFilename(row: LaporanSppdPdfData, prefix = "Laporan-SPPD"): string {
  const nomor = (row.nomor_surat ?? "").replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const d = row.tanggal_mulai ? new Date(row.tanggal_mulai) : null;
  const tgl = d && !isNaN(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";
  const parts = [prefix, nomor || "tanpa-nomor", tgl].filter(Boolean);
  return `${parts.join("_")}.pdf`;
}

export async function downloadLaporanSppdPdf(row: LaporanSppdPdfData) {
  const logo = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await addHtmlPageToPdf(pdf, buildLaporanSppdHtml(row, logo), "portrait", true);
  pdf.save(laporanSppdPdfFilename(row));
}
