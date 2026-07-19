import { get as idbGet, set as idbSet } from "idb-keyval";
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

// Small text fields go in localStorage (fast, synchronous → available on first paint).
// Large data-URL images (logo_url, bg_url) go in IndexedDB where the ~5MB
// localStorage quota does not apply, so caching does not silently fail.
const LS_KEY = "display-settings-cache-v2";
const IDB_LOGO = "display-settings-logo-url-v1";
const IDB_BG = "display-settings-bg-url-v1";

// In-memory mirror so components can read cached images synchronously
// after the first async hydration.
let memCache: DisplaySettings | null = null;

function readLocalMeta(): Partial<DisplaySettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<DisplaySettings>;
  } catch {
    return {};
  }
}

function writeLocalMeta(meta: Partial<DisplaySettings>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(meta));
  } catch {
    /* ignore quota */
  }
}

/** Kick off async hydration of the large images from IndexedDB into the
 *  in-memory cache so subsequent `getCachedDisplaySettings()` calls return
 *  them synchronously. Safe to call multiple times. */
async function hydrateFromIdb() {
  if (typeof window === "undefined") return;
  try {
    const [logo, bg] = await Promise.all([
      idbGet<string>(IDB_LOGO),
      idbGet<string>(IDB_BG),
    ]);
    memCache = {
      ...DEFAULT_DISPLAY,
      ...readLocalMeta(),
      ...(logo ? { logo_url: logo } : {}),
      ...(bg ? { bg_url: bg } : {}),
    };
    // Notify subscribers (e.g. React components) that cached images are ready.
    window.dispatchEvent(new CustomEvent("display-settings-hydrated"));
  } catch {
    /* ignore */
  }
}

// Fire-and-forget hydration on module load so images are ready ASAP.
if (typeof window !== "undefined") {
  void hydrateFromIdb();
}


export function getCachedDisplaySettings(): DisplaySettings {
  if (typeof window === "undefined") return DEFAULT_DISPLAY;
  if (memCache) return memCache;
  // Return metadata from localStorage even if IndexedDB hydration hasn't
  // finished yet — the images will appear as soon as hydration completes
  // and the query result arrives.
  return { ...DEFAULT_DISPLAY, ...readLocalMeta() };
}

export async function fetchDisplaySettings(): Promise<DisplaySettings> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key,value")
      .like("key", "display.%");
    if (error) throw error;
    const out: any = { ...DEFAULT_DISPLAY };
    for (const row of data ?? []) {
      const k = (row.key as string).replace("display.", "");
      if (k in out && row.value != null && row.value !== "") out[k] = row.value;
    }
    const settings = out as DisplaySettings;

    if (typeof window !== "undefined") {
      // Persist small text fields in localStorage.
      const { logo_url, bg_url, ...meta } = settings;
      writeLocalMeta(meta);
      // Persist large images in IndexedDB (no 5MB quota).
      try {
        await Promise.all([
          idbSet(IDB_LOGO, logo_url ?? ""),
          idbSet(IDB_BG, bg_url ?? ""),
        ]);
      } catch {
        /* ignore */
      }
      memCache = settings;
    }
    return settings;
  } catch {
    // On network/query failure fall back to last-known cached values so the
    // logo/hero don't disappear.
    await hydrateFromIdb();
    return getCachedDisplaySettings();
  }
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
