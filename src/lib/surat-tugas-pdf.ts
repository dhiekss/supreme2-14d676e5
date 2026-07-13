import { jsPDF } from "jspdf";
import {
  addHtmlPageToPdf,
  escapeHtml,
  fmtHariTanggalId,
  fmtTanggalId,
  INSTANSI,
  KEPSEK_JABATAN,
  KOTA,
  KPA_NAMA,
  KPA_NIP,
  KPA_PANGKAT,
  loadLogoDataUrl,
} from "./pdf-html-common";

export type PesertaPdf = {
  nama_peserta?: string | null;
  nip?: string | null;
  jabatan?: string | null;
  pangkat_golongan?: string | null;
  urutan?: number | null;
  is_utama?: boolean | null;
};

export type SuratTugasPdfData = {
  nomor_surat?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  tujuan_lokasi?: string | null;
  keperluan?: string | null;
  waktu_berangkat?: string | null;
  dasar_surat_ada?: boolean | null;
  nomor_dasar_surat?: string | null;
  tanggal_dasar_surat?: string | null;
  perihal_dasar_surat?: string | null;
  instansi_dasar_surat?: string | null;
  peserta?: PesertaPdf[];
};

const URUTAN_LABEL = ["Pertama", "Kedua", "Ketiga", "Keempat", "Kelima"];

function kopHtml(logo: string): string {
  return `
  <table style="width:100%; border-collapse:collapse; margin-bottom:6px; font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="width:110px; vertical-align:middle; text-align:center;">
        <img src="${logo}" style="width:95px; height:auto;" />
      </td>
      <td style="text-align:center; vertical-align:middle; line-height:1.2;">
        <div style="font-size:12px;">PEMERINTAH DAERAH PROVINSI JAWA BARAT</div>
        <div style="font-size:12px;">DINAS PENDIDIKAN</div>
        <div style="font-size:12px;">CABANG DINAS PENDIDIKAN WILAYAH IV</div>
        <div style="font-size:16px; font-weight:bold; margin-top:0;">SMK NEGERI 1 PUSAKANAGARA</div>
        <div style="font-size:10px;">Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240</div>
        <div style="font-size:10px;">Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com</div>
        <div style="font-size:10px;">SUBANG - 41255</div>
      </td>
      <td style="width:50px;"></td>
    </tr>
  </table>
  <div style="border-top:3px solid #000; border-bottom:1px solid #000; height:4px; margin-bottom:14px;"></div>
  `;
}


function pesertaBlockHtml(p: PesertaPdf, idx: number): string {
  const label = URUTAN_LABEL[idx] ?? `Ke-${idx + 1}`;
  const rowStyle = "vertical-align:middle;";
  const cellStyle = "padding:0; vertical-align:middle; line-height:1.15;";
  const lbl = `width:110px; ${cellStyle}`;
  const sep = `width:10px; ${cellStyle}`;
  return `
    <div style="margin:6px 0 4px 0;"><b>${idx + 1}. ${label}</b></div>
    <table style="width:100%; border-collapse:collapse; font-size:12px; line-height:1.15; margin-left:16px; table-layout:fixed;">
      <tr style="${rowStyle}"><td style="${lbl}">Nama</td><td style="${sep}">:</td><td style="${cellStyle}">${escapeHtml(p.nama_peserta)}</td></tr>
      <tr style="${rowStyle}"><td style="${lbl}">NIP</td><td style="${sep}">:</td><td style="${cellStyle}">${escapeHtml(p.nip)}</td></tr>
      <tr style="${rowStyle}"><td style="${lbl}">Pangkat/Gol</td><td style="${sep}">:</td><td style="${cellStyle}">${escapeHtml(p.pangkat_golongan)}</td></tr>
      <tr style="${rowStyle}"><td style="${lbl}">Jabatan</td><td style="${sep}">:</td><td style="${cellStyle}">${escapeHtml(p.jabatan)}</td></tr>
      <tr style="${rowStyle}"><td style="${lbl}">Unit Kerja</td><td style="${sep}">:</td><td style="${cellStyle}">${INSTANSI}</td></tr>
    </table>
  `;
}

export function buildSuratTugasHtml(row: SuratTugasPdfData, logo: string): string {
  const peserta = (row.peserta ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const tableCell = "padding:0; vertical-align:middle; line-height:1.15;";
  const dasarHtml = row.dasar_surat_ada
    ? `
      <div style="margin-top:6px;">Berdasarkan surat yang kami terima dari :</div>
      <table style="border-collapse:collapse; font-size:12px; line-height:1.15; margin-left:18px; margin-top:2px; table-layout:fixed;">
        <tr><td style="width:80px; ${tableCell}">Nomor</td><td style="width:10px; ${tableCell}">:</td><td style="${tableCell}">${escapeHtml(row.nomor_dasar_surat)}</td></tr>
        <tr><td style="${tableCell}">Tanggal</td><td style="${tableCell}">:</td><td style="${tableCell}">${fmtTanggalId(row.tanggal_dasar_surat)}</td></tr>
        <tr><td style="${tableCell}">Perihal</td><td style="${tableCell}">:</td><td style="${tableCell}">${escapeHtml(row.perihal_dasar_surat)}</td></tr>
        ${row.instansi_dasar_surat ? `<tr><td style="${tableCell}">Instansi</td><td style="${tableCell}">:</td><td style="${tableCell}">${escapeHtml(row.instansi_dasar_surat)}</td></tr>` : ""}
      </table>
    `
    : "";

  const pesertaHtml = peserta.map((p, i) => pesertaBlockHtml(p, i)).join("");
  const tglSurat = fmtTanggalId(row.tanggal_mulai);

  return `
  <div style="width:794px; height:1123px; padding:50px 60px; box-sizing:border-box; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#000; line-height:1.15;">
    ${kopHtml(logo)}
    <div style="text-align:center; margin-bottom:2px;">
      <span style="font-size:15px; font-weight:bold; text-decoration:underline;">SURAT PERINTAH TUGAS</span>
    </div>
    <div style="text-align:center; margin-bottom:14px;">Nomor: ${escapeHtml(row.nomor_surat)}</div>

    ${dasarHtml}

    <div style="margin-top:8px;">Kepala SMKN 1 Pusakanagara, Menugaskan :</div>
    <div style="margin-top:6px;">Kepada :</div>

    ${pesertaHtml}

    <table style="border-collapse:collapse; margin-top:10px; font-size:12px; line-height:1.15; table-layout:fixed;">
      <tr style="vertical-align:middle;">
        <td style="width:60px; ${tableCell}">Untuk</td>
        <td style="width:10px; ${tableCell}">:</td>
        <td style="${tableCell}">
          Melaksanakan / Mengikuti / Menghadiri Kegiatan :
          <div style="font-weight:bold; margin-top:2px;">${escapeHtml(row.keperluan)}</div>
        </td>
      </tr>
    </table>

    <div style="margin-top:8px; margin-left:16px;">Yang akan dilaksanakan pada :</div>
    <table style="border-collapse:collapse; margin-left:26px; font-size:12px; line-height:1.15; table-layout:fixed;">
      <tr style="vertical-align:middle;"><td style="width:110px; ${tableCell}">Hari, Tanggal</td><td style="width:10px; ${tableCell}">:</td><td style="${tableCell}">${fmtHariTanggalId(row.tanggal_mulai, row.tanggal_selesai)}</td></tr>
      <tr style="vertical-align:middle;"><td style="${tableCell}">Waktu</td><td style="${tableCell}">:</td><td style="${tableCell}">${row.waktu_berangkat ? escapeHtml(row.waktu_berangkat) + " WIB" : ""}</td></tr>
      <tr style="vertical-align:middle;"><td style="${tableCell}">Tempat Tujuan</td><td style="${tableCell}">:</td><td style="${tableCell}">${escapeHtml(row.tujuan_lokasi)}</td></tr>
    </table>

    <div style="margin-top:14px; text-align:justify;">
      Demikian surat perintah tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya, dengan rasa tanggung jawab dan setelah selesai kegiatan agar menyampaikan laporan.
    </div>

    <div style="margin-top:26px; margin-left:52%; font-size:12px;">
      <div>${KOTA}, ${tglSurat}</div>
      <div>${KEPSEK_JABATAN},</div>
      <div style="height:70px;"></div>
      <div style="font-weight:bold; text-decoration:underline;">${KPA_NAMA}</div>
      <div>PENATA, III/c</div>
      <div>NIP. ${KPA_NIP}</div>
    </div>
  </div>
  `;
}

export function suratTugasPdfFilename(row: SuratTugasPdfData, prefix = "Surat-Tugas"): string {
  const nomor = (row.nomor_surat ?? "").replace(/[\\/:*?"<>|\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const d = row.tanggal_mulai ? new Date(row.tanggal_mulai) : null;
  const tgl = d && !isNaN(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";
  const parts = [prefix, nomor || "tanpa-nomor", tgl].filter(Boolean);
  return `${parts.join("_")}.pdf`;
}

export async function downloadSuratTugasPdf(row: SuratTugasPdfData) {
  const logo = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await addHtmlPageToPdf(pdf, buildSuratTugasHtml(row, logo), "portrait", true);
  pdf.save(suratTugasPdfFilename(row));
}
