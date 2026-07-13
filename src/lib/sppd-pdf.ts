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

/**
 * Renders SPPD onto the CURRENT page of `doc` (must be A4 landscape).
 */
export async function renderSppd(doc: jsPDF, row: SppdPdfData): Promise<void> {
  const pageW = doc.internal.pageSize.getWidth();   // 297
  const marginL = 8;
  const marginR = 8;
  const gap = 5;
  const colW = (pageW - marginL - marginR - gap) / 2; // ~138
  const leftX = marginL;
  const rightX = marginL + colW + gap;

  // ============ LEFT COLUMN ============
  const logo = await loadLogoDataUrl();
  let y = 8;
  if (logo) doc.addImage(logo, "PNG", leftX + 4, y, 22, 24);

  const kopCX = leftX + colW / 2 + 8;
  doc.setFont(FONT, "normal");
  doc.setFontSize(9.5);
  doc.text("PEMERINTAH DAERAH PROVINSI JAWA BARAT", kopCX, y + 3, { align: "center" });
  doc.text("DINAS PENDIDIKAN", kopCX, y + 6.8, { align: "center" });
  doc.text("CABANG DINAS PENDIDIKAN WILAYAH IV", kopCX, y + 10.6, { align: "center" });
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  doc.text("SMK NEGERI 1 PUSAKANAGARA", kopCX, y + 15.8, { align: "center" });
  doc.setFont(FONT, "normal");
  doc.setFontSize(8);
  doc.text("Jalan Raya Pusakanagara No.154 Telp. (0260) 7544240", kopCX, y + 19.6, { align: "center" });
  doc.text("Website : smknpusakanagara.sch.id | Email : smknpusakanagara@gmail.com", kopCX, y + 22.8, { align: "center" });
  doc.text("SUBANG - 41255", kopCX, y + 26, { align: "center" });
  y += 28;
  doc.setLineWidth(0.6);
  doc.line(leftX, y, leftX + colW, y);
  y += 0.8;
  doc.setLineWidth(0.25);
  doc.line(leftX, y, leftX + colW, y);
  y += 5;

  // Info block
  doc.setFontSize(9);
  const infoX = leftX + 42;
  const infoLabelW = 30;
  const infoValW = colW - (infoX - leftX) - infoLabelW - 3;
  const drawInfo = (label: string, value: string) => {
    doc.text(label, infoX, y);
    doc.text(":", infoX + infoLabelW, y);
    const lines = doc.splitTextToSize(value ?? "", infoValW);
    doc.text(lines, infoX + infoLabelW + 3, y);
    y += 4.3 * Math.max(1, lines.length);
  };
  drawInfo("Lembar Ke", "2 (dua)");
  drawInfo("Kode Rekening", row.kode_ring ?? "");
  drawInfo("Kode Kegiatan", row.kode_kegiatan ?? "");
  drawInfo("Nomor", row.nomor_surat ?? "");
  y += 3;

  // Judul
  doc.setFont(FONT, "bold");
  doc.setFontSize(10.5);
  const judul = "SURAT PERINTAH PERJALANAN DINAS (SPPD)";
  doc.text(judul, leftX + colW / 2, y, { align: "center" });
  const jw = doc.getTextWidth(judul);
  doc.setLineWidth(0.3);
  doc.line((leftX + colW / 2) - jw / 2, y + 0.8, (leftX + colW / 2) + jw / 2, y + 0.8);
  y += 5;
  doc.setFont(FONT, "normal");
  doc.setFontSize(8.5);

  // ===== TABLE =====
  const cNum = 7;
  const cLabel = 52;
  const cVal = colW - cNum - cLabel; // 79
  const cNip = 42;
  const cKet = cVal - cNip;
  const pad = 1.3;
  const lh = 3.6;

  const wrap = (s: string, w: number) => doc.splitTextToSize(s || "", Math.max(1, w - pad * 2));

  type Row =
    | { kind: "std"; num?: string; label: string; sub?: boolean; value: string | string[] }
    | { kind: "hdr8" }
    | { kind: "peserta8"; idx: number; nama: string; nip: string; ket: string };

  const peserta = (row.peserta ?? []).slice().sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
  const pelaksana = peserta[0];
  const pengikut = peserta.slice(1);

  const rows: Row[] = [
    { kind: "std", num: "1", label: "Pengguna Anggaran / Kuasa Pengguna Anggaran", value: [KPA_NAMA, `NIP. ${KPA_NIP}`] },
    { kind: "std", num: "2", label: "Nama/NIP Pegawai yang melaksanakan Perjalanan Dinas", value: pelaksana ? [pelaksana.nama_peserta ?? "", `NIP. ${pelaksana.nip ?? ""}`] : "" },
    { kind: "std", num: "3", sub: true, label: "a.  Pangkat dan Golongan", value: pelaksana?.pangkat_golongan ?? "" },
    { kind: "std", sub: true, label: "b.  Jabatan/Instansi", value: [pelaksana?.jabatan ?? "", INSTANSI].filter(Boolean).join(" / ") },
    { kind: "std", sub: true, label: "c.  Tingkat Biaya Perjalanan Dinas", value: "" },
    { kind: "std", num: "4", label: "Maksud Perjalanan Dinas", value: row.keperluan ?? "" },
    { kind: "std", num: "5", label: "Alat angkutan yang dipergunakan", value: row.kendaraan ?? "Roda 4" },
    { kind: "std", num: "6", sub: true, label: "a.  Tempat berangkat", value: INSTANSI },
    { kind: "std", sub: true, label: "b.  Tempat tujuan", value: row.tujuan_lokasi ?? "" },
    { kind: "std", num: "7", sub: true, label: "a.  Lamanya Perjalanan Dinas", value: `${daysBetween(row.tanggal_mulai, row.tanggal_selesai)} (hari)` },
    { kind: "std", sub: true, label: "b.  Tanggal berangkat", value: fmtTanggalId(row.tanggal_mulai) },
    { kind: "std", sub: true, label: "c.  Tanggal harus kembali/tiba di tempat baru", value: fmtTanggalId(row.tanggal_selesai) },
    { kind: "hdr8" },
  ];
  const slots = Math.max(2, pengikut.length);
  for (let i = 0; i < slots; i++) {
    const p = pengikut[i];
    rows.push({ kind: "peserta8", idx: i + 1, nama: p?.nama_peserta ?? "", nip: p?.nip ?? "", ket: p?.jabatan ?? "" });
  }
  rows.push(
    { kind: "std", num: "9", label: "Pembebanan Anggaran", value: "" },
    { kind: "std", sub: true, label: "a.  Instansi", value: INSTANSI },
    { kind: "std", sub: true, label: "b.  Akun", value: row.kode_ring ?? "" },
    { kind: "std", num: "10", label: "Keterangan lain-lain", value: "" },
  );

  const tableX = leftX;
  doc.setLineWidth(0.2);

  const drawText = (lines: string[], x: number, top: number) => {
    // draw so first baseline sits at top + pad + lh - 0.6
    let ty = top + pad + lh - 0.6;
    lines.forEach((ln) => { doc.text(ln, x, ty); ty += lh; });
  };

  for (const r of rows) {
    if (r.kind === "std") {
      const valArr = Array.isArray(r.value) ? r.value : [r.value];
      const valueLines = valArr.flatMap((v) => wrap(v, cVal));
      const labelLines = wrap(r.label, cLabel - (r.sub ? 3 : 0));
      const rowH = Math.max(labelLines.length, valueLines.length, 1) * lh + pad * 2;
      doc.rect(tableX, y, cNum, rowH);
      doc.rect(tableX + cNum, y, cLabel, rowH);
      doc.rect(tableX + cNum + cLabel, y, cVal, rowH);
      if (r.num) doc.text(r.num, tableX + cNum / 2, y + pad + lh - 0.6, { align: "center" });
      drawText(labelLines, tableX + cNum + pad + (r.sub ? 3 : 0), y);
      drawText(valueLines, tableX + cNum + cLabel + pad, y);
      y += rowH;
    } else if (r.kind === "hdr8") {
      const rowH = lh + pad * 2;
      doc.rect(tableX, y, cNum, rowH);
      doc.rect(tableX + cNum, y, cLabel, rowH);
      doc.rect(tableX + cNum + cLabel, y, cNip, rowH);
      doc.rect(tableX + cNum + cLabel + cNip, y, cKet, rowH);
      doc.text("8", tableX + cNum / 2, y + pad + lh - 0.6, { align: "center" });
      doc.text("Pengikut : Nama", tableX + cNum + pad, y + pad + lh - 0.6);
      doc.text("NIP/Tanggal Lahir", tableX + cNum + cLabel + pad, y + pad + lh - 0.6);
      doc.text("Keterangan", tableX + cNum + cLabel + cNip + pad, y + pad + lh - 0.6);
      y += rowH;
    } else {
      // peserta8: [][idx. nama][nip][ket]
      const namaLines = wrap(`${r.idx}. ${r.nama}`.trim(), cLabel);
      const nipLines = wrap(r.nip, cNip);
      const ketLines = wrap(r.ket, cKet);
      const rowH = Math.max(namaLines.length, nipLines.length, ketLines.length, 1) * lh + pad * 2;
      doc.rect(tableX, y, cNum, rowH);
      doc.rect(tableX + cNum, y, cLabel, rowH);
      doc.rect(tableX + cNum + cLabel, y, cNip, rowH);
      doc.rect(tableX + cNum + cLabel + cNip, y, cKet, rowH);
      drawText(namaLines, tableX + cNum + pad, y);
      drawText(nipLines, tableX + cNum + cLabel + pad, y);
      drawText(ketLines, tableX + cNum + cLabel + cNip + pad, y);
      y += rowH;
    }
  }

  // ===== TTD kiri =====
  y += 3;
  const ttdLX = leftX + colW - 78;
  doc.setFontSize(9);
  doc.text(`Dikeluarkan di : ${KOTA_ASAL}`, ttdLX, y);
  y += 4.2;
  doc.text(`Tanggal          : ${fmtTanggalId(row.tanggal_mulai)}`, ttdLX, y);
  y += 4.2;
  doc.text("Kuasa Pengguna Anggaran", ttdLX, y);
  y += 14;
  doc.setFont(FONT, "bold");
  doc.text(KPA_NAMA, ttdLX + 5, y);
  const nw = doc.getTextWidth(KPA_NAMA);
  doc.setLineWidth(0.3);
  doc.line(ttdLX + 5, y + 0.8, ttdLX + 5 + nw, y + 0.8);
  y += 4;
  doc.setFont(FONT, "normal");
  doc.text(KPA_PANGKAT, ttdLX + 5, y);
  y += 4;
  doc.text(`NIP. ${KPA_NIP}`, ttdLX + 5, y);

  // ============ RIGHT COLUMN ============
  let ry = 8;
  doc.setFontSize(9);
  const lampLabelW = 22;
  const lampX = rightX;
  const drawLamp = (label: string, value: string) => {
    doc.text(label, lampX, ry);
    doc.text(":", lampX + lampLabelW, ry);
    const lines = doc.splitTextToSize(value ?? "", colW - lampLabelW - 6);
    doc.text(lines, lampX + lampLabelW + 3, ry);
    ry += 4.3 * Math.max(1, lines.length);
  };
  drawLamp("Lampiran", "Surat Perjalanan Dinas");
  drawLamp("Nomor", row.nomor_surat ?? "");
  drawLamp("Tanggal", fmtTanggalId(row.tanggal_mulai));
  ry += 3;

  // Visum boxes
  const rHalf = colW / 2;
  const boxLeftX = rightX;
  const boxRightX = rightX + rHalf;

  const drawBox = (x: number, top: number, w: number, h: number) => {
    doc.setLineWidth(0.25);
    doc.rect(x, top, w, h);
  };
  const kvLabelW = 26;
  const drawKV = (x: number, top: number, label: string, value: string) => {
    doc.text(label, x + 2, top);
    doc.text(":", x + 2 + kvLabelW, top);
    const w = rHalf - 4 - kvLabelW - 3;
    const lines = doc.splitTextToSize(value ?? "", w);
    doc.text(lines, x + 2 + kvLabelW + 3, top);
  };

  // Top row: kiri kosong, kanan Berangkat awal + TTD
  const topH = 38;
  drawBox(boxLeftX, ry, rHalf, topH);
  drawBox(boxRightX, ry, rHalf, topH);
  let cy = ry + 5;
  drawKV(boxRightX, cy, "Berangkat dari", INSTANSI);
  cy += 4.5;
  drawKV(boxRightX, cy, "Ke", row.tujuan_lokasi ?? "");
  cy += 4.5;
  drawKV(boxRightX, cy, "Pada Tanggal", fmtTanggalId(row.tanggal_mulai));
  cy += 12;
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

  // Segmen I, II, III
  const segH = 22;
  const drawSeg = (roman: string) => {
    drawBox(boxLeftX, ry, rHalf, segH);
    drawBox(boxRightX, ry, rHalf, segH);
    let a = ry + 5;
    doc.text(`${roman}. Tiba di`, boxLeftX + 2, a);
    doc.text(":", boxLeftX + 2 + kvLabelW, a);
    a += 4.5;
    doc.text("Pada Tanggal", boxLeftX + 2, a);
    doc.text(":", boxLeftX + 2 + kvLabelW, a);
    a += 4.5;
    doc.text("Kepala", boxLeftX + 2, a);
    doc.text(":", boxLeftX + 2 + kvLabelW, a);
    let b = ry + 5;
    doc.text("Berangkat dari", boxRightX + 2, b);
    doc.text(":", boxRightX + 2 + kvLabelW, b);
    b += 4.5;
    doc.text("Ke", boxRightX + 2, b);
    doc.text(":", boxRightX + 2 + kvLabelW, b);
    b += 4.5;
    doc.text("Pada Tanggal", boxRightX + 2, b);
    doc.text(":", boxRightX + 2 + kvLabelW, b);
    b += 4.5;
    doc.text("Kepala", boxRightX + 2, b);
    doc.text(":", boxRightX + 2 + kvLabelW, b);
    ry += segH;
  };
  drawSeg("I");
  drawSeg("II");
  drawSeg("III");

  // Segmen IV
  const ivH = 40;
  drawBox(boxLeftX, ry, rHalf, ivH);
  drawBox(boxRightX, ry, rHalf, ivH);
  let iy = ry + 5;
  doc.text("IV. Tiba kembali di :", boxLeftX + 2, iy);
  iy += 4.5;
  doc.text(INSTANSI, boxLeftX + 2, iy);
  iy += 4.5;
  doc.text(`Pada Tanggal  : ${fmtTanggalId(row.tanggal_selesai)}`, boxLeftX + 2, iy);
  iy += 11;
  doc.setFont(FONT, "bold");
  doc.text(KPA_NAMA, boxLeftX + 4, iy);
  doc.line(boxLeftX + 4, iy + 0.8, boxLeftX + 4 + doc.getTextWidth(KPA_NAMA), iy + 0.8);
  iy += 4;
  doc.setFont(FONT, "normal");
  doc.text(KPA_PANGKAT, boxLeftX + 4, iy);
  iy += 4;
  doc.text(`NIP. ${KPA_NIP}`, boxLeftX + 4, iy);

  let ky = ry + 5;
  const ketLines = doc.splitTextToSize(
    "Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu sesingkat-singkatnya",
    rHalf - 6,
  );
  doc.setFontSize(8);
  doc.text(ketLines, boxRightX + 2, ky);
  ky += ketLines.length * 3.6 + 3;
  doc.setFontSize(9);
  doc.text("Kuasa Pengguna Anggaran", boxRightX + 2, ky);
  ky += 11;
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
  doc.setFontSize(9);
  doc.text("V. PERHATIAN", rightX, ry);
  doc.setFont(FONT, "normal");
  ry += 4;
  doc.setFontSize(7.5);
  const perhatian = "PA/KPA yang telah menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat / tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita rugi akibat kesalahan, kelalaian dan kealpaannya.";
  const pLines = doc.splitTextToSize(perhatian, colW);
  doc.text(pLines, rightX, ry);
}

export async function generateSppdPdf(row: SppdPdfData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  await renderSppd(doc, row);
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
