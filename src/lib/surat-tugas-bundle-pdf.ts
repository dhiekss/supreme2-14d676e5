import { jsPDF } from "jspdf";
import { renderSuratTugas, suratTugasPdfFilename, type SuratTugasPdfData } from "./surat-tugas-pdf";
import { renderSppd, type SppdPdfData } from "./sppd-pdf";
import { renderLaporanSppd, type LaporanSppdPdfData } from "./laporan-sppd-pdf";

export type BundlePdfData = SuratTugasPdfData & SppdPdfData & LaporanSppdPdfData;

export async function downloadSuratTugasBundlePdf(row: BundlePdfData) {
  // Page 1: Surat Tugas (A4 portrait)
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await renderSuratTugas(doc, row);

  // Page 2: SPPD (A4 landscape)
  doc.addPage("a4", "landscape");
  await renderSppd(doc, row);

  // Page 3: Laporan SPPD (A4 portrait)
  doc.addPage("a4", "portrait");
  await renderLaporanSppd(doc, row);

  const filename = suratTugasPdfFilename(row, "Surat-Tugas-Lengkap");
  doc.save(filename);
}
