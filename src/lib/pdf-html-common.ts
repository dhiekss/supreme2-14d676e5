import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import logoJabarAsset from "@/assets/logo-jabar.png.asset.json";

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function fmtTanggalId(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtHariTanggalId(a?: string | null, b?: string | null): string {
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

export function daysBetween(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  const diff = Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

export function escapeHtml(s?: string | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

let logoCache: string | null = null;
export async function loadLogoDataUrl(): Promise<string> {
  if (logoCache) return logoCache;
  const res = await fetch(logoJabarAsset.url);
  const blob = await res.blob();
  logoCache = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
  return logoCache;
}

export const INSTANSI = "SMK Negeri 1 Pusakanagara";
export const KOTA = "Subang";
export const KPA_NAMA = "ABDUL ROSID, S.T";
export const KPA_NIP = "19811122 200902 1003";
export const KPA_PANGKAT = "Penata / III-c";
export const KEPSEK_JABATAN = "KEPALA SEKOLAH";

/**
 * Render an offscreen HTML page-sized element to canvas and add to jsPDF.
 * Element must be sized exactly to A4 (portrait: 794x1123 px, landscape: 1123x794 px).
 */
export async function addHtmlPageToPdf(
  pdf: jsPDF,
  html: string,
  orientation: "portrait" | "landscape",
  isFirstPage: boolean,
): Promise<void> {
  const isPortrait = orientation === "portrait";
  const wPx = isPortrait ? 794 : 1123;
  const hPx = isPortrait ? 1123 : 794;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = `${wPx}px`;
  host.style.height = `${hPx}px`;
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: wPx,
      windowHeight: hPx,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (!isFirstPage) pdf.addPage("a4", orientation);
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
  } finally {
    host.remove();
  }
}
