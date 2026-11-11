import {
  getPropertyCalendar,
  type CalendarDay,
} from "@/lib/hospitable";
import { addUtcDays, eachNight, isValidStayRange, utcToday } from "@/lib/dates";
import { createServiceClient } from "@/lib/supabase/service";
import type { PropertyRow } from "@/types/database";

const CALENDAR_HORIZON_DAYS = 120;

const CANCELLED = new Set([
  "cancelled",
  "canceled",
  "not accepted",
  "not_accepted",
]);

export async function localStayUnblocked(
  companyId: string,
  propertyId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .in("status", ["pending", "paid", "confirmed"])
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)
    .limit(1);
  if (bookings?.length) return false;

  const { data: reservations } = await supabase
    .from("hospitable_reservations")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)
    .limit(20);
  const blocked = (reservations ?? []).some((row) => {
    const status = row.status?.toLowerCase() ?? "";
    return status && !CANCELLED.has(status);
  });
  return !blocked;
}

export async function isStayOpen(
  companyId: string,
  property: PropertyRow,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  if (!isValidStayRange(checkIn, checkOut)) return false;

  const localOpen = await localStayUnblocked(
    companyId,
    property.id,
    checkIn,
    checkOut,
  );
  if (!localOpen) return false;

  if (!property.hospitable_property_id) return true;

  try {
    const days = await getPropertyCalendar(
      companyId,
      property.hospitable_property_id,
      checkIn,
      checkOut,
    );
    const stayNights = eachNight(checkIn, checkOut);
    const byDate = new Map(days.map((day) => [day.date, day]));
    return stayNights.every((date) => byDate.get(date)?.available !== false);
  } catch {
    return localOpen;
  }
}

export async function filterOpenProperties(
  companyId: string,
  properties: PropertyRow[],
  checkIn: string,
  checkOut: string,
): Promise<PropertyRow[]> {
  if (!isValidStayRange(checkIn, checkOut)) return [];
  const results = await Promise.all(
    properties.map(async (property) => ({
      property,
      open: await isStayOpen(companyId, property, checkIn, checkOut),
    })),
  );
  return results.filter((row) => row.open).map((row) => row.property);
}

async function blockedNightsInRange(
  companyId: string,
  propertyId: string,
  start: string,
  end: string,
): Promise<Set<string>> {
  const blocked = new Set<string>();
  const supabase = createServiceClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("check_in, check_out")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .in("status", ["pending", "paid", "confirmed"])
    .lt("check_in", end)
    .gt("check_out", start);

  for (const row of bookings ?? []) {
    for (const night of eachNight(row.check_in, row.check_out)) {
      if (night >= start && night < end) blocked.add(night);
    }
  }

  const { data: reservations } = await supabase
    .from("hospitable_reservations")
    .select("check_in, check_out, status")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .lt("check_in", end)
    .gt("check_out", start);

  for (const row of reservations ?? []) {
    const status = row.status?.toLowerCase() ?? "";
    if (status && CANCELLED.has(status)) continue;
    if (!row.check_in || !row.check_out) continue;
    for (const night of eachNight(row.check_in, row.check_out)) {
      if (night >= start && night < end) blocked.add(night);
    }
  }

  return blocked;
}

async function localCalendarDays(
  companyId: string,
  propertyId: string,
  start: string,
  end: string,
): Promise<CalendarDay[]> {
  const blocked = await blockedNightsInRange(
    companyId,
    propertyId,
    start,
    end,
  );
  const days: CalendarDay[] = [];
  let cursor = start;
  while (cursor < end) {
    days.push({
      date: cursor,
      available: !blocked.has(cursor),
      minStay: null,
      priceCents: null,
      currency: "USD",
    });
    cursor = addUtcDays(cursor, 1);
  }
  return days;
}

export async function fetchPropertyStayCalendar(
  companyId: string,
  property: PropertyRow,
): Promise<CalendarDay[]> {
  const start = utcToday();
  const end = addUtcDays(start, CALENDAR_HORIZON_DAYS);

  if (property.hospitable_property_id) {
    try {
      const days = await getPropertyCalendar(
        companyId,
        property.hospitable_property_id,
        start,
        end,
      );
      if (days.length > 0) {
        return mergeLocalBlockedNights(
          days,
          await blockedNightsInRange(companyId, property.id, start, end),
          start,
          end,
        );
      }
    } catch {
      /* fall back to local blocks */
    }
  }

  return localCalendarDays(companyId, property.id, start, end);
}

function mergeLocalBlockedNights(
  hospitableDays: CalendarDay[],
  blocked: Set<string>,
  start: string,
  end: string,
): CalendarDay[] {
  const byDate = new Map(hospitableDays.map((day) => [day.date, day]));
  let cursor = start;
  while (cursor < end) {
    if (blocked.has(cursor)) {
      const existing = byDate.get(cursor);
      byDate.set(cursor, {
        date: cursor,
        available: false,
        minStay: existing?.minStay ?? null,
        priceCents: existing?.priceCents ?? null,
        currency: existing?.currency ?? "USD",
      });
    }
    cursor = addUtcDays(cursor, 1);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function stayOpenForRange(
  days: CalendarDay[],
  checkIn: string,
  checkOut: string,
): boolean {
  if (!isValidStayRange(checkIn, checkOut)) return false;
  const byDate = new Map(days.map((day) => [day.date, day]));
  return eachNight(checkIn, checkOut).every(
    (date) => byDate.get(date)?.available !== false,
  );
}
