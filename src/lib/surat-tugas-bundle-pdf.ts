import { jsPDF } from "jspdf";
import {
  addHtmlPageToPdf,
  loadLogoDataUrl,
} from "./pdf-html-common";
import {
  buildSuratTugasHtml,
  suratTugasPdfFilename,
  type SuratTugasPdfData,
} from "./surat-tugas-pdf";
import { buildSppdHtml, type SppdPdfData } from "./sppd-pdf";
import { buildLaporanSppdHtml, type LaporanSppdPdfData } from "./laporan-sppd-pdf";

export type BundlePdfData = SuratTugasPdfData & SppdPdfData & LaporanSppdPdfData;

export async function downloadSuratTugasBundlePdf(row: BundlePdfData) {
  const logo = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  // Halaman 1 — Surat Tugas (portrait)
  await addHtmlPageToPdf(pdf, buildSuratTugasHtml(row, logo), "portrait", true);
  // Halaman 2 — SPPD (landscape)
  await addHtmlPageToPdf(pdf, buildSppdHtml(row, logo), "landscape", false);
  // Halaman 3 — Laporan SPPD (portrait)
  await addHtmlPageToPdf(pdf, buildLaporanSppdHtml(row, logo), "portrait", false);
  pdf.save(suratTugasPdfFilename(row, "Surat-Tugas-Lengkap"));
}
