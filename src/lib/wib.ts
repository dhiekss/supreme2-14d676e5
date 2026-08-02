/** Waktu Indonesia Barat (UTC+7) helpers. */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Current date/time shifted to WIB (use only for reading date parts in UTC getters). */
export function wibNow(): Date {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

/** Today's date in WIB as YYYY-MM-DD, regardless of device/server timezone. */
export function todayWIB(): string {
  return wibNow().toISOString().slice(0, 10);
}
