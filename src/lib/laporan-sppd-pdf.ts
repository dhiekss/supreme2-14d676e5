import { jsPDF } from "jspdf";
import logoJabarAsset from "@/assets/logo-jabar.png.asset.json";

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function fmtTanggalId(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtHariTanggalId(a?: string | null, b?: string | null): string {
  if (!a) return "";
  const da = new Date(a);
  if (isNaN(da.getTime())) return String(a);
  const hariA = HARI_ID[da.getDay()];
  const fa = fmtTanggalId(a);
  if (!b || a === b) return `${hariA}, ${fa}`;
  const db = new Date(b);
  if (isNaN(db.getTime())) return `${hariA}, ${fa}`;
  const hariB = HARI_ID[db.getDay()];
  return `${hariA}, ${fa} s.d. ${hariB}, ${fmtTanggalId(b)}`;
}

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

const FONT = "helvetica";

let logoCache: string | null = null;
async function loadLogoDataUrl(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch(logoJabarAsset.url);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(blob);
    });
    logoCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

export async function renderLaporanSppd(doc: jsPDF, row: LaporanSppdPdfData): Promise<void> {
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 15;


  // ===== LOGO =====
  const logo = await loadLogoDataUrl();
  if (logo) {
    doc.addImage(logo, "PNG", marginL + 2, y - 2, 25, 28);
  }

  // ===== KOP =====
  const kopCenterX = pageW / 2 + 8;
  doc.setFont(FONT, "normal");
  doc.setFontSize(12);
  doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", kopCenterX, y, { align: "center" });
  y += 5;
  doc.text("DINAS PENDIDIKAN", kopCenterX, y, { align: "center" });
  y += 5;
  doc.text("CABANG DINAS PENDIDIKAN WILAYAH IV", kopCenterX, y, { align: "center" });
  y += 6;
  doc.setFont(FONT, "bold");
  doc.setFontSize(16);
  doc.text("SMK NEGERI 1 PUSAKANAGARA", kopCenterX, y, { align: "center" });
  y += 5;
  doc.setFont(FONT, "normal");
  doc.setFontSize(10);
  doc.text("Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240", kopCenterX, y, { align: "center" });
  y += 4;
  doc.text("Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com", kopCenterX, y, { align: "center" });
  y += 4;
  doc.text("SUBANG - 41255", kopCenterX, y, { align: "center" });
  y += 3;

  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);
  y += 1.2;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ===== JUDUL =====
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  const judul = "LAPORAN PERJALANAN DINAS";
  doc.text(judul, pageW / 2, y, { align: "center" });
  const jw = doc.getTextWidth(judul);
  doc.setLineWidth(0.4);
  doc.line((pageW - jw) / 2, y + 0.8, (pageW + jw) / 2, y + 0.8);
  y += 5;
  doc.setFont(FONT, "normal");
  doc.setFontSize(11);
  doc.text(`Nomor: ${row.nomor_surat ?? ""}`, pageW / 2, y, { align: "center" });
  y += 9;

  const lineH = 5;

  // ===== A. PENDAHULUAN =====
  doc.setFont(FONT, "bold");
  doc.text("A. PENDAHULUAN", marginL, y);
  doc.setFont(FONT, "normal");
  y += lineH + 1;

  // 1. Dasar
  doc.text("1. Dasar", marginL, y);
  y += lineH;
  const subX = marginL + 8;
  const labelW = 28;
  const drawSub = (letter: string, label: string, value: string) => {
    doc.text(`${letter}. ${label}`, subX, y);
    doc.text(":", subX + labelW, y);
    const lines = doc.splitTextToSize(value ?? "", contentW - labelW - 12);
    doc.text(lines, subX + labelW + 3, y);
    y += lineH * Math.max(1, lines.length);
  };
  if (row.dasar_surat_ada) {
    drawSub("a", "Dasar Surat", row.perihal_dasar_surat ?? "");
    drawSub("b", "Nomor", row.nomor_dasar_surat ?? "");
    drawSub("c", "Tanggal", fmtTanggalId(row.tanggal_dasar_surat));
  } else {
    doc.text("Tidak ada dasar surat.", subX, y);
    y += lineH;
  }
  y += 2;

  // 2. Tujuan
  doc.text("2. Tujuan", marginL, y);
  y += lineH;
  const tujuanLines = doc.splitTextToSize(row.keperluan ?? "", contentW - 8);
  doc.text(tujuanLines, subX, y);
  y += lineH * tujuanLines.length + 2;

  // 3. Waktu
  doc.text("3. Waktu", marginL, y);
  y += lineH;
  const waktuText = fmtHariTanggalId(row.tanggal_mulai, row.tanggal_selesai);
  const waktuLines = doc.splitTextToSize(waktuText, contentW - 8);
  doc.text(waktuLines, subX, y);
  y += lineH * waktuLines.length + 2;

  // 4. Tempat Tujuan
  doc.text("4. Tempat Tujuan", marginL, y);
  y += lineH;
  const tujuanArr = (row.tujuan_lokasi ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (tujuanArr.length === 0) tujuanArr.push("");
  tujuanArr.forEach((t, i) => {
    const wrapped = doc.splitTextToSize(`${i + 1}. ${t}`, contentW - 8);
    doc.text(wrapped, subX, y);
    y += lineH * wrapped.length;
  });
  y += 4;

  // ===== B. PENUTUP =====
  doc.setFont(FONT, "bold");
  doc.text("B. PENUTUP", marginL, y);
  doc.setFont(FONT, "normal");
  y += lineH + 1;
  doc.text("Kesimpulan :", marginL, y);
  y += lineH + 2;

  // Garis-garis kosong untuk diisi manual
  const lineCount = 7;
  for (let i = 0; i < lineCount; i++) {
    doc.setLineWidth(0.2);
    doc.line(marginL, y, pageW - marginR, y);
    y += lineH + 2;
  }

  y += 6;

  // ===== TTD =====
  const peserta = (row.peserta ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const pelapor = peserta[0];
  const ttdX = pageW - marginR - 75;
  const tglSurat = fmtTanggalId(row.tanggal_selesai ?? row.tanggal_mulai);
  doc.text(`Subang, ${tglSurat}`, ttdX, y);
  y += lineH;
  doc.text("Pelapor,", ttdX, y);
  y += lineH * 5;
  doc.setFont(FONT, "bold");
  const nama = (pelapor?.nama_peserta ?? "").toUpperCase();
  doc.text(nama, ttdX, y);
  // garis bawah nama
  const nw = doc.getTextWidth(nama);
  if (nama) {
    doc.setLineWidth(0.3);
    doc.line(ttdX, y + 0.8, ttdX + nw, y + 0.8);
  }
  y += lineH;
  doc.setFont(FONT, "normal");
  doc.text(`NIP. ${pelapor?.nip ?? ""}`, ttdX, y);
}

export async function generateLaporanSppdPdf(row: LaporanSppdPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await renderLaporanSppd(doc, row);
  return doc;
}


export function laporanSppdPdfFilename(row: LaporanSppdPdfData, prefix = "Laporan-SPPD"): string {
  const nomor = (row.nomor_surat ?? "")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const d = row.tanggal_mulai ? new Date(row.tanggal_mulai) : null;
  const tgl = d && !isNaN(d.getTime())
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : "";
  const parts = [prefix, nomor || "tanpa-nomor", tgl].filter(Boolean);
  return `${parts.join("_")}.pdf`;
}

export async function downloadLaporanSppdPdf(row: LaporanSppdPdfData) {
  const doc = await generateLaporanSppdPdf(row);
  doc.save(laporanSppdPdfFilename(row));
}
