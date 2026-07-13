import { jsPDF } from "jspdf";

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

export function generateSuratTugasPdf(row: SuratTugasPdfData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 15;

  // ===== KOP =====
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", pageW / 2 + 8, y, { align: "center" });
  y += 5;
  doc.text("DINAS PENDIDIKAN", pageW / 2 + 8, y, { align: "center" });
  y += 5;
  doc.text("CABANG DINAS PENDIDIKAN WILAYAH IV", pageW / 2 + 8, y, { align: "center" });
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("SMK NEGERI 1 PUSAKANAGARA", pageW / 2 + 8, y, { align: "center" });
  y += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240", pageW / 2 + 8, y, { align: "center" });
  y += 4;
  doc.text("Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com", pageW / 2 + 8, y, { align: "center" });
  y += 4;
  doc.text("SUBANG - 41255", pageW / 2 + 8, y, { align: "center" });
  y += 3;

  // Garis pemisah kop (double line)
  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);
  y += 1.2;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // ===== JUDUL =====
  doc.setFont("times", "bold");
  doc.setFontSize(13);
  const judul = "SURAT PERINTAH TUGAS";
  doc.text(judul, pageW / 2, y, { align: "center" });
  const jw = doc.getTextWidth(judul);
  doc.setLineWidth(0.4);
  doc.line((pageW - jw) / 2, y + 0.8, (pageW + jw) / 2, y + 0.8);
  y += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text(`Nomor: ${row.nomor_surat ?? ""}`, pageW / 2, y, { align: "center" });
  y += 8;

  const lineH = 5;
  const drawLabelValue = (label: string, value: string, labelW = 32, indent = 0) => {
    const x = marginL + indent;
    doc.text(label, x, y);
    doc.text(":", x + labelW, y);
    const lines = doc.splitTextToSize(value ?? "", contentW - labelW - 4 - indent);
    doc.text(lines, x + labelW + 3, y);
    y += lineH * lines.length;
  };

  // ===== DASAR SURAT (opsional) =====
  if (row.dasar_surat_ada) {
    doc.text("Berdasarkan surat yang kami terima dari :", marginL, y);
    y += lineH;
    drawLabelValue("Nomor", row.nomor_dasar_surat ?? "", 25, 6);
    drawLabelValue("Tanggal", fmtTanggalId(row.tanggal_dasar_surat), 25, 6);
    drawLabelValue("Perihal", row.perihal_dasar_surat ?? "", 25, 6);
    if (row.instansi_dasar_surat) {
      drawLabelValue("Instansi", row.instansi_dasar_surat, 25, 6);
    }
    y += 2;
  }

  // ===== Menugaskan =====
  doc.text("Kepala SMKN 1 Pusakanagara, Menugaskan :", marginL, y);
  y += lineH + 2;
  doc.text("Kepada :", marginL, y);
  y += lineH;

  // ===== Peserta =====
  const peserta = (row.peserta ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  peserta.forEach((p, i) => {
    const label = URUTAN_LABEL[i] ?? `Ke-${i + 1}`;
    doc.setFont("times", "bold");
    doc.text(`${i + 1}. ${label}`, marginL, y);
    doc.setFont("times", "normal");
    y += lineH;
    drawLabelValue("Nama", p.nama_peserta ?? "", 28, 4);
    drawLabelValue("NIP", p.nip ?? "", 28, 4);
    drawLabelValue("Pangkat/Gol", p.pangkat_golongan ?? "", 28, 4);
    drawLabelValue("Jabatan", p.jabatan ?? "", 28, 4);
    drawLabelValue("Unit Kerja", "SMK Negeri 1 Pusakanagara", 28, 4);
    y += 2;
  });

  y += 2;
  // ===== Untuk =====
  doc.text("Untuk", marginL, y);
  doc.text(":", marginL + 20, y);
  doc.text("Melaksanakan / Mengikuti / Menghadiri Kegiatan :", marginL + 23, y);
  y += lineH;
  const keperluanLines = doc.splitTextToSize(row.keperluan ?? "", contentW - 27);
  doc.setFont("times", "bold");
  doc.text(keperluanLines, marginL + 23, y);
  doc.setFont("times", "normal");
  y += lineH * keperluanLines.length + 3;

  // ===== Waktu =====
  doc.text("Yang akan dilaksanakan pada :", marginL + 6, y);
  y += lineH;
  const oldMargin = marginL;
  const savedY = y;
  y = savedY;
  const drawIndent = (label: string, value: string) => {
    const x = oldMargin + 10;
    doc.text(label, x, y);
    doc.text(":", x + 28, y);
    const lines = doc.splitTextToSize(value ?? "", contentW - 42);
    doc.text(lines, x + 31, y);
    y += lineH * lines.length;
  };
  drawIndent("Hari, Tanggal", fmtHariTanggalId(row.tanggal_mulai, row.tanggal_selesai));
  drawIndent("Waktu", row.waktu_berangkat ? `${row.waktu_berangkat} WIB` : "");
  drawIndent("Tempat Tujuan", row.tujuan_lokasi ?? "");
  y += 4;

  // ===== Penutup =====
  const penutup = "Demikian surat perintah tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya, dengan rasa tanggung jawab dan setelah selesai kegiatan agar menyampaikan laporan.";
  const penutupLines = doc.splitTextToSize(penutup, contentW);
  doc.text(penutupLines, marginL, y, { align: "justify", maxWidth: contentW });
  y += lineH * penutupLines.length + 8;

  // ===== TTD =====
  const ttdX = pageW - marginR - 70;
  const tglSurat = row.tanggal_mulai ? fmtTanggalId(row.tanggal_mulai) : "";
  doc.text(`Subang, ${tglSurat}`, ttdX, y);
  y += lineH;
  doc.text("KEPALA SEKOLAH,", ttdX, y);
  y += lineH * 5;
  doc.setFont("times", "bold");
  doc.text("ABDUL ROSID, S.T.", ttdX, y);
  y += lineH;
  doc.setFont("times", "normal");
  doc.text("PENATA, III/c", ttdX, y);
  y += lineH;
  doc.text("NIP. 19811122 200902 1 003", ttdX, y);

  return doc;
}

export function downloadSuratTugasPdf(row: SuratTugasPdfData) {
  const doc = generateSuratTugasPdf(row);
  const nomor = (row.nomor_surat ?? "surat-tugas").replaceAll("/", "-").replaceAll(" ", "_");
  doc.save(`Surat-Tugas_${nomor}.pdf`);
}
