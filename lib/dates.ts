import { nightsBetween } from "@/lib/pricelabs";

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addUtcDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function eachNight(checkIn: string, checkOut: string): string[] {
  const count = nightsBetween(checkIn, checkOut);
  if (count < 1) return [];
  return Array.from({ length: count }, (_, i) => addUtcDays(checkIn, i));
}

export function isValidStayRange(checkIn: string, checkOut: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(checkIn) &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkOut) &&
    nightsBetween(checkIn, checkOut) >= 1
  );
}
