/**
 * Hospitable has no API sandbox — POST /reservations affects real calendars.
 * Default: writes only on Vercel production. Preview/local require explicit opt-in.
 */
export function hospitableReservationWriteEnabled(): boolean {
  const raw = process.env.HOSPITABLE_RESERVATION_WRITE?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return process.env.VERCEL_ENV === "production";
}
