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

export type PdfMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/**
 * Render an offscreen HTML page-sized element to canvas and add to jsPDF.
 * Element must be sized exactly to A4 (portrait: 794x1123 px, landscape: 1123x794 px).
 * Optional margins in px; content is rendered inside the inner area and placed
 * at the margin offsets on the PDF page.
 */
export async function addHtmlPageToPdf(
  pdf: jsPDF,
  html: string,
  orientation: "portrait" | "landscape",
  isFirstPage: boolean,
  margins?: PdfMargins,
): Promise<void> {
  const isPortrait = orientation === "portrait";
  const pageWPx = isPortrait ? 794 : 1123;
  const pageHPx = isPortrait ? 1123 : 794;

  const marginLeft = margins?.left ?? 0;
  const marginRight = margins?.right ?? 0;
  const marginTop = margins?.top ?? 0;
  const marginBottom = margins?.bottom ?? 0;

  const wPx = pageWPx - marginLeft - marginRight;
  const hPx = pageHPx - marginTop - marginBottom;

  // Render inside an isolated off-screen div so the app's Tailwind v4 CSS
  // (which uses oklch()/lab() color functions unsupported by html2canvas)
  // does not leak into the capture target. The div is sized exactly to the
  // content area; the built-in styles reset the typography and colors.
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${wPx}px`;
  container.style.height = `${hPx}px`;
  container.style.overflow = "hidden";
  container.style.opacity = "0";
  container.style.pointerEvents = "none";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  try {
    container.innerHTML = `<!doctype html><div style="width:100%; height:100%; background:#ffffff; color:#000000; font-family:Arial,Helvetica,sans-serif; overflow:hidden; box-sizing:border-box;"><style>
      *{box-sizing:border-box;}
      #pdf-page{width:100%; height:100%; overflow:hidden; position:relative;}
      table{max-width:100%;}
    </style><div id="pdf-page">${html}</div></div>`;

    // Wait for images (logo) to load
    const imgs = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.onload = () => res();
              img.onerror = () => res();
            }),
      ),
    );

    const target = container.querySelector("#pdf-page")! as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (!isFirstPage) pdf.addPage("a4", orientation);
    pdf.addImage(imgData, "JPEG", marginLeft, marginTop, wPx, hPx, undefined, "FAST");
  } finally {
    container.remove();
  }
}
