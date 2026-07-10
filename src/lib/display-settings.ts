import { supabase } from "@/integrations/supabase/client";

export type DisplaySettings = {
  app_name: string;
  subtitle: string;
  instansi: string;
  footer: string;
  logo_url: string;
  bg_url: string;
  bg_color: string;
};

export const DEFAULT_DISPLAY: DisplaySettings = {
  app_name: "SUPREME XPOES",
  subtitle: "Students Presence and",
  instansi: "Management of Education",
  footer: "© 2025 SUPREME - Students Presence and Management of Education - Bidang Kurikulum SMKN 1 Pusakanagara",
  logo_url: "",
  bg_url: "",
  bg_color: "#c8fefb",
};

export async function fetchDisplaySettings(): Promise<DisplaySettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("key,value")
    .like("key", "display.%");
  const out: any = { ...DEFAULT_DISPLAY };
  for (const row of data ?? []) {
    const k = (row.key as string).replace("display.", "");
    if (k in out && row.value != null && row.value !== "") out[k] = row.value;
  }
  return out as DisplaySettings;
}

/** Compress + convert an image File to a data URL. Returns dataURL string. */
export async function fileToDataUrl(
  file: File,
  opts: { maxW: number; maxH: number; quality?: number; mime?: string } = { maxW: 1200, maxH: 1200 },
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const ratio = Math.min(opts.maxW / width, opts.maxH / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const mime = opts.mime ?? (file.type === "image/png" ? "image/png" : "image/jpeg");
  return canvas.toDataURL(mime, opts.quality ?? 0.85);
}
