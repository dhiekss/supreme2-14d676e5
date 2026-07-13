import { jsPDF } from "jspdf";
import logoJabarAsset from "@/assets/logo-jabar.png.asset.json";

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmtTanggalId(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function daysBetween(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  const diff = Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

export type SppdPeserta = {
  nama_peserta?: string | null;
  nip?: string | null;
  jabatan?: string | null;
  pangkat_golongan?: string | null;
  urutan?: number | null;
  is_utama?: boolean | null;
};

export type SppdPdfData = {
  nomor_surat?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  tujuan_lokasi?: string | null;
  keperluan?: string | null;
  kendaraan?: string | null;
  kode_kegiatan?: string | null;
  kode_ring?: string | null;
  peserta?: SppdPeserta[];
};

const FONT = "helvetica";
const KPA_NAMA = "ABDUL ROSID, S.T";
const KPA_NIP = "19811122 200902 1003";
const KPA_PANGKAT = "Penata / III-c";
const INSTANSI = "SMK Negeri 1 Pusakanagara";
const KOTA_ASAL = "Subang";

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

export async function generateSppdPdf(row: SppdPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();   // 297
  const pageH = doc.internal.pageSize.getHeight();  // 210
  const marginL = 10;
  const marginR = 10;
  const gap = 6;
  const colW = (pageW - marginL - marginR - gap) / 2;
  const leftX = marginL;
  const rightX = marginL + colW + gap;

  // ============ LEFT COLUMN ============
  let y = 10;
  const logo = await loadLogoDataUrl();
  if (logo) {
    doc.addImage(logo, "PNG", leftX + 4, y - 1, 22, 24);
  }
  const kopCX = leftX + colW / 2 + 6;
  doc.setFont(FONT, "normal");
  doc.setFontSize(10);
  doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", kopCX, y + 2, { align: "center" });
  doc.text("DINAS PENDIDIKAN", kopCX, y + 6, { align: "center" });
  doc.text("CABANG DINAS PENDIDIKAN WILAYAH IV", kopCX, y + 10, { align: "center" });
  doc.setFont(FONT, "bold");
  doc.setFontSize(13);
  doc.text("SMK NEGERI 1 PUSAKANAGARA", kopCX, y + 15, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);
  doc.text("Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240", kopCX, y + 19, { align: "center" });
  doc.text("Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com", kopCX, y + 22.5, { align: "center" });
  doc.text("SUBANG - 41255", kopCX, y + 26, { align: "center" });
  y += 28;
  doc.setLineWidth(0.7);
  doc.line(leftX, y, leftX + colW, y);
  y += 1;
  doc.setLineWidth(0.3);
  doc.line(leftX, y, leftX + colW, y);
  y += 5;

  // Header info (Lembar / Kode / Nomor)
  doc.setFontSize(9);
  const infoX = leftX + 55;
  const infoLabelW = 32;
  const drawInfo = (label: string, value: string) => {
    doc.text(label, infoX, y);
    doc.text(":", infoX + infoLabelW, y);
    doc.text(value, infoX + infoLabelW + 3, y);
    y += 4.5;
  };
  drawInfo("Lembar Ke", "2 (dua)");
  drawInfo("Kode Rekening", row.kode_ring ?? "");
  drawInfo("Kode Kegiatan", row.kode_kegiatan ?? "");
  drawInfo("Nomor", row.nomor_surat ?? "");
  y += 3;

  // Judul
  doc.setFont(FONT, "bold");
  doc.setFontSize(11);
  const judul = "SURAT PERINTAH PERJALANAN DINAS (SPPD)";
  doc.text(judul, leftX + colW / 2, y, { align: "center" });
  const jw = doc.getTextWidth(judul);
  doc.setLineWidth(0.3);
  doc.line((leftX + colW / 2) - jw / 2, y + 0.8, (leftX + colW / 2) + jw / 2, y + 0.8);
  y += 5;
  doc.setFont(FONT, "normal");
  doc.setFontSize(9);

  // Table rows
  const peserta = (row.peserta ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const pelaksana = peserta[0];
  const pengikut = peserta.slice(1);

  const colNumW = 7;
  const colLabelW = 62;
  const colValW = colW - colNumW - colLabelW;
  const tableX = leftX;
  const tableTop = y;

  type Row = { num?: string; label: string; value: string | string[]; sub?: boolean; };
  const rows: Row[] = [
    { num: "1", label: "Pengguna Anggaran / Kuasa Pengguna Anggaran", value: [`${KPA_NAMA}`, `NIP. ${KPA_NIP}`] },
    { num: "2", label: "Nama/NIP Pegawai yang melaksanakan Perjalanan Dinas", value: pelaksana ? [`${pelaksana.nama_peserta ?? ""}`, `NIP. ${pelaksana.nip ?? ""}`] : "" },
    { num: "3", label: "a.  Pangkat dan Golongan", value: pelaksana?.pangkat_golongan ?? "", sub: true },
    { label: "b.  Jabatan/Instansi", value: [pelaksana?.jabatan ?? "", INSTANSI].filter(Boolean).join(" / "), sub: true },
    { label: "c.  Tingkat Biaya Perjalanan Dinas", value: "", sub: true },
    { num: "4", label: "Maksud Perjalanan Dinas", value: row.keperluan ?? "" },
    { num: "5", label: "Alat angkutan yang dipergunakan", value: row.kendaraan ?? "Roda 4" },
    { num: "6", label: "a.  Tempat berangkat", value: INSTANSI, sub: true },
    { label: "b.  Tempat tujuan", value: row.tujuan_lokasi ?? "", sub: true },
    { num: "7", label: "a.  Lamanya Perjalanan Dinas", value: `${daysBetween(row.tanggal_mulai, row.tanggal_selesai)} (hari)`, sub: true },
    { label: "b.  Tanggal berangkat", value: fmtTanggalId(row.tanggal_mulai), sub: true },
    { label: "c.  Tanggal harus kembali/tiba di tempat baru", value: fmtTanggalId(row.tanggal_selesai), sub: true },
  ];

  // Draw rows 1..7
  const lh = 4;
  const cellPad = 1.2;
  const drawRow = (r: Row) => {
    const valueLines = Array.isArray(r.value)
      ? r.value.flatMap((v) => doc.splitTextToSize(v, colValW - cellPad * 2))
      : doc.splitTextToSize(r.value || "", colValW - cellPad * 2);
    const labelLines = doc.splitTextToSize(r.label, colLabelW - cellPad * 2 - (r.sub ? 3 : 0));
    const rowH = Math.max(labelLines.length, valueLines.length, 1) * lh + cellPad * 2;
    // borders
    doc.setLineWidth(0.2);
    doc.rect(tableX, y, colNumW, rowH);
    doc.rect(tableX + colNumW, y, colLabelW, rowH);
    doc.rect(tableX + colNumW + colLabelW, y, colValW, rowH);
    if (r.num) doc.text(r.num, tableX + colNumW / 2, y + cellPad + lh - 0.5, { align: "center" });
    doc.text(labelLines, tableX + colNumW + cellPad + (r.sub ? 3 : 0), y + cellPad + lh - 0.5);
    doc.text(valueLines, tableX + colNumW + colLabelW + cellPad, y + cellPad + lh - 0.5);
    y += rowH;
  };
  rows.forEach(drawRow);

  // Row 8 Pengikut — special header split value column into (Nama | NIP | Ket)
  const nameW = colValW * 0.5;
  const nipW = colValW * 0.3;
  const ketW = colValW - nameW - nipW;
  // header
  {
    const rowH = lh + cellPad * 2;
    doc.rect(tableX, y, colNumW, rowH);
    doc.rect(tableX + colNumW, y, colLabelW, rowH);
    doc.rect(tableX + colNumW + colLabelW, y, nameW, rowH);
    doc.rect(tableX + colNumW + colLabelW + nameW, y, nipW, rowH);
    doc.rect(tableX + colNumW + colLabelW + nameW + nipW, y, ketW, rowH);
    doc.text("8", tableX + colNumW / 2, y + cellPad + lh - 0.5, { align: "center" });
    doc.text("Pengikut : Nama", tableX + colNumW + cellPad, y + cellPad + lh - 0.5);
    doc.text("NIP/Tanggal Lahir", tableX + colNumW + colLabelW + cellPad, y + cellPad + lh - 0.5);
    doc.text("Keterangan", tableX + colNumW + colLabelW + nameW + cellPad, y + cellPad + lh - 0.5);
    // header shows "Nama" label in value col — adjust: put Nama in first val col
    y += rowH;
  }
  // Pengikut rows (min 2)
  const pengikutRows = pengikut.length ? pengikut : [];
  const slots = Math.max(2, pengikutRows.length);
  for (let i = 0; i < slots; i++) {
    const p = pengikutRows[i];
    const rowH = lh + cellPad * 2;
    doc.rect(tableX, y, colNumW, rowH);
    doc.rect(tableX + colNumW, y, colLabelW, rowH);
    doc.rect(tableX + colNumW + colLabelW, y, nameW, rowH);
    doc.rect(tableX + colNumW + colLabelW + nameW, y, nipW, rowH);
    doc.rect(tableX + colNumW + colLabelW + nameW + nipW, y, ketW, rowH);
    doc.text(`${i + 1}.`, tableX + colNumW + cellPad + 2, y + cellPad + lh - 0.5);
    if (p) {
      doc.text(doc.splitTextToSize(p.nama_peserta ?? "", nameW - cellPad * 2), tableX + colNumW + colLabelW + cellPad, y + cellPad + lh - 0.5);
      doc.text(doc.splitTextToSize(p.nip ?? "", nipW - cellPad * 2), tableX + colNumW + colLabelW + nameW + cellPad, y + cellPad + lh - 0.5);
      doc.text(doc.splitTextToSize(p.jabatan ?? "", ketW - cellPad * 2), tableX + colNumW + colLabelW + nameW + nipW + cellPad, y + cellPad + lh - 0.5);
    }
    y += rowH;
  }

  // Row 9, 10
  const restRows: Row[] = [
    { num: "9", label: "Pembebanan Anggaran", value: "" },
    { label: "a.  Instansi", value: INSTANSI, sub: true },
    { label: "b.  Akun", value: row.kode_ring ?? "", sub: true },
    { num: "10", label: "Keterangan lain-lain", value: "" },
  ];
  restRows.forEach(drawRow);

  // TTD kiri
  y += 4;
  const ttdLX = leftX + colW - 78;
  doc.text(`Dikeluarkan di : ${KOTA_ASAL}`, ttdLX, y);
  y += 4.5;
  doc.text(`Tanggal          : ${fmtTanggalId(row.tanggal_mulai)}`, ttdLX, y);
  y += 4.5;
  doc.text("Kuasa Pengguna Anggaran", ttdLX, y);
  y += 16;
  doc.setFont(FONT, "bold");
  doc.text(KPA_NAMA, ttdLX + 5, y);
  const nw = doc.getTextWidth(KPA_NAMA);
  doc.setLineWidth(0.3);
  doc.line(ttdLX + 5, y + 0.8, ttdLX + 5 + nw, y + 0.8);
  y += 4.5;
  doc.setFont(FONT, "normal");
  doc.text(KPA_PANGKAT, ttdLX + 5, y);
  y += 4;
  doc.text(`NIP. ${KPA_NIP}`, ttdLX + 5, y);

  // ============ RIGHT COLUMN ============
  let ry = 10;
  // Lampiran header
  doc.setFontSize(9);
  const lampLabelW = 20;
  const lampX = rightX + 2;
  const drawLamp = (label: string, value: string) => {
    doc.text(label, lampX, ry);
    doc.text(":", lampX + lampLabelW, ry);
    doc.text(value, lampX + lampLabelW + 3, ry);
    ry += 4.5;
  };
  drawLamp("Lampiran", "");
  drawLamp("Nomor", row.nomor_surat ?? "");
  drawLamp("Tanggal", fmtTanggalId(row.tanggal_mulai));
  ry += 3;

  // Visum table: 2 cols
  const rColW = colW;
  const rHalf = rColW / 2;
  const boxLeftX = rightX;
  const boxRightX = rightX + rHalf;

  // Row 0 (top): kanan berisi Berangkat dari SMKN, ke tujuan, tanggal + TTD KPA
  const drawBox = (x: number, top: number, w: number, h: number) => {
    doc.setLineWidth(0.25);
    doc.rect(x, top, w, h);
  };
  const drawKV = (x: number, top: number, label: string, value: string) => {
    doc.text(label, x + 2, top);
    doc.text(":", x + 32, top);
    doc.text(value, x + 35, top);
  };

  // Top row (single: kiri kosong / kanan berangkat awal)
  const topH = 34;
  drawBox(boxLeftX, ry, rHalf, topH);
  drawBox(boxRightX, ry, rHalf, topH);
  // kanan
  let cy = ry + 5;
  drawKV(boxRightX, cy, "Berangkat dari", KOTA_ASAL);
  cy += 5;
  drawKV(boxRightX, cy, "Ke", row.tujuan_lokasi ?? "");
  cy += 5;
  drawKV(boxRightX, cy, "Pada Tanggal", fmtTanggalId(row.tanggal_mulai));
  cy += 10;
  doc.setFont(FONT, "bold");
  doc.text(KPA_NAMA, boxRightX + 4, cy);
  doc.setLineWidth(0.3);
  doc.line(boxRightX + 4, cy + 0.8, boxRightX + 4 + doc.getTextWidth(KPA_NAMA), cy + 0.8);
  cy += 4;
  doc.setFont(FONT, "normal");
  doc.text(KPA_PANGKAT, boxRightX + 4, cy);
  cy += 4;
  doc.text(`NIP. ${KPA_NIP}`, boxRightX + 4, cy);
  ry += topH;

  // Segmen I, II, III (Tiba di / Berangkat dari)
  const segH = 22;
  const drawSegment = (roman: string) => {
    drawBox(boxLeftX, ry, rHalf, segH);
    drawBox(boxRightX, ry, rHalf, segH);
    let cy = ry + 5;
    doc.text(`${roman}. Tiba di`, boxLeftX + 2, cy);
    doc.text(":", boxLeftX + 32, cy);
    cy += 5;
    doc.text("Pada Tanggal", boxLeftX + 2, cy);
    doc.text(":", boxLeftX + 32, cy);
    cy += 5;
    doc.text("Kepala", boxLeftX + 2, cy);
    doc.text(":", boxLeftX + 32, cy);
    let cy2 = ry + 5;
    doc.text("Berangkat dari", boxRightX + 2, cy2);
    doc.text(":", boxRightX + 32, cy2);
    cy2 += 5;
    doc.text("Ke", boxRightX + 2, cy2);
    doc.text(":", boxRightX + 32, cy2);
    cy2 += 5;
    doc.text("Pada Tanggal", boxRightX + 2, cy2);
    doc.text(":", boxRightX + 32, cy2);
    cy2 += 5;
    doc.text("Kepala", boxRightX + 2, cy2);
    doc.text(":", boxRightX + 32, cy2);
    ry += segH;
  };
  drawSegment("I");
  drawSegment("II");
  drawSegment("III");

  // Segmen IV: Tiba kembali di + KPA check
  const ivH = 40;
  drawBox(boxLeftX, ry, rHalf, ivH);
  drawBox(boxRightX, ry, rHalf, ivH);
  let iy = ry + 5;
  doc.text("IV. Tiba kembali di :", boxLeftX + 2, iy);
  iy += 5;
  doc.text(INSTANSI, boxLeftX + 2, iy);
  iy += 5;
  doc.text(`Pada Tanggal  : ${fmtTanggalId(row.tanggal_selesai)}`, boxLeftX + 2, iy);
  iy += 10;
  doc.setFont(FONT, "bold");
  doc.text(KPA_NAMA, boxLeftX + 4, iy);
  doc.line(boxLeftX + 4, iy + 0.8, boxLeftX + 4 + doc.getTextWidth(KPA_NAMA), iy + 0.8);
  iy += 4;
  doc.setFont(FONT, "normal");
  doc.text(KPA_PANGKAT, boxLeftX + 4, iy);
  iy += 4;
  doc.text(`NIP. ${KPA_NIP}`, boxLeftX + 4, iy);

  // Right: keterangan
  let ky = ry + 5;
  const ketLines = doc.splitTextToSize(
    "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu sesingkat-singkatnya",
    rHalf - 6,
  );
  doc.text(ketLines, boxRightX + 2, ky);
  ky += ketLines.length * 4 + 3;
  doc.text("Kuasa Pengguna Anggaran", boxRightX + 2, ky);
  ky += 10;
  doc.setFont(FONT, "bold");
  doc.text(KPA_NAMA, boxRightX + 4, ky);
  doc.line(boxRightX + 4, ky + 0.8, boxRightX + 4 + doc.getTextWidth(KPA_NAMA), ky + 0.8);
  ky += 4;
  doc.setFont(FONT, "normal");
  doc.text(KPA_PANGKAT, boxRightX + 4, ky);
  ky += 4;
  doc.text(`NIP. ${KPA_NIP}`, boxRightX + 4, ky);
  ry += ivH;

  // V. Perhatian
  ry += 3;
  doc.setFont(FONT, "bold");
  doc.text("V. PERHATIAN", rightX, ry);
  doc.setFont(FONT, "normal");
  ry += 4;
  const perhatian = "PA/KPA yang telah menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita rugi akibat kesalahan, kelalaian dan kealpaannya.";
  const pLines = doc.splitTextToSize(perhatian, colW);
  doc.setFontSize(8);
  doc.text(pLines, rightX, ry);

  return doc;
}

export function sppdPdfFilename(row: SppdPdfData, prefix = "SPPD"): string {
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

export async function downloadSppdPdf(row: SppdPdfData) {
  const doc = await generateSppdPdf(row);
  doc.save(sppdPdfFilename(row));
}
