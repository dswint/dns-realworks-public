import { createHmac, timingSafeEqual } from "crypto";
import { cache } from "react";

import { addUtcDays, utcToday } from "@/lib/dates";
import { getIntegration } from "@/lib/integrations";
import { createServiceClient } from "@/lib/supabase/service";

const BASE = "https://public.api.hospitable.com/v2";

export type HospitablePropertySummary = {
  id: string;
  name: string;
  publicName: string | null;
};

type Paginated<T> = {
  data: T[];
  meta?: { pagination?: { total?: number; total_pages?: number } };
};

async function hospitableFetch(
  companyId: string,
  path: string,
  init: RequestInit = {},
) {
  const account = await getIntegration(companyId, "hospitable");
  const token = account?.credentials.token;
  if (!token) throw new Error("Hospitable is not connected.");
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Hospitable ${response.status}: ${text.slice(0, 300)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function paginatedItems<T>(json: unknown): T[] {
  if (!json || typeof json !== "object") return [];
  const record = json as Paginated<T> & { properties?: T[] };
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.properties)) return record.properties;
  return [];
}

export async function testHospitableConnection(companyId: string) {
  const json = await hospitableFetch(
    companyId,
    "/properties?page=1&per_page=1",
  );
  const pagination = (json as Paginated<unknown>)?.meta?.pagination;
  const properties = await listHospitableProperties(companyId);
  return {
    propertyCount: pagination?.total ?? properties.length,
    sampleProperties: properties.slice(0, 5),
  };
}

export async function listHospitableProperties(
  companyId: string,
): Promise<HospitablePropertySummary[]> {
  const items: HospitablePropertySummary[] = [];
  let page = 1;
  for (;;) {
    const json = await hospitableFetch(
      companyId,
      `/properties?page=${page}&per_page=100`,
    );
    const batch = paginatedItems<Record<string, unknown>>(json);
    if (!batch.length) break;
    for (const row of batch) {
      const id = String(row.id ?? row.uuid ?? "");
      if (!id) continue;
      items.push({
        id,
        name: String(row.name ?? row.public_name ?? "Property"),
        publicName:
          typeof row.public_name === "string" ? row.public_name : null,
      });
    }
    const totalPages = (json as Paginated<unknown>)?.meta?.pagination
      ?.total_pages;
    if (totalPages && page >= totalPages) break;
    if (batch.length < 100) break;
    page += 1;
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export type CalendarDay = {
  date: string;
  available: boolean;
  minStay: number | null;
  priceCents: number | null;
  currency: string;
};

function calendarDaysFromResponse(
  json: unknown,
): Array<Record<string, unknown>> {
  if (!json || typeof json !== "object") return [];
  const record = json as Record<string, unknown>;
  if (Array.isArray(record.days)) return record.days;
  const data = record.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.days)) return nested.days;
  }
  return [];
}

function calendarDayAvailable(day: Record<string, unknown>): boolean {
  const status = day.status;
  if (status && typeof status === "object" && "available" in status) {
    return (status as { available?: boolean }).available !== false;
  }
  if (typeof day.available === "boolean") return day.available;
  return false;
}

export const getPropertyCalendar = cache(async function getPropertyCalendar(
  companyId: string,
  propertyUuid: string,
  start: string,
  end: string,
): Promise<CalendarDay[]> {
  const json = await hospitableFetch(
    companyId,
    `/properties/${propertyUuid}/calendar?start_date=${start}&end_date=${end}`,
  );
  const days = calendarDaysFromResponse(json);
  return days.map((day) => {
    const price = day.price as
      { amount?: number; currency?: string } | undefined;
    return {
      date: String(day.date),
      available: calendarDayAvailable(day),
      minStay: typeof day.min_stay === "number" ? day.min_stay : null,
      priceCents: typeof price?.amount === "number" ? price.amount : null,
      currency: price?.currency ?? "USD",
    };
  });
});

export async function createManualReservation(
  companyId: string,
  input: {
    propertyId: string;
    arrivalDate: string;
    departureDate: string;
    currency: string;
    guest: { firstName: string; lastName: string; email: string };
    guests: { adults: number };
    financials: { accommodation: number; cleaningFee: number };
  },
) {
  const json = await hospitableFetch(companyId, "/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return json?.data ?? json;
}

export type HospitableReservationPayload = {
  id?: string;
  uuid?: string;
  platform?: string;
  status?: string;
  reservation_status?: { current?: { category?: string } };
  property_id?: string;
  properties?: Array<{ id?: string; uuid?: string }>;
  arrival_date?: string;
  departure_date?: string;
  check_in?: string;
  check_out?: string;
  guest?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    phone_numbers?: Array<string | { number?: string }>;
    id?: string | number;
    marketing_opt_in?: boolean;
    opted_in?: boolean;
  };
};

function reservationStatus(payload: HospitableReservationPayload) {
  const raw =
    payload.status ??
    payload.reservation_status?.current?.category ??
    "unknown";
  return raw.toLowerCase();
}

function reservationListPath(
  page: number,
  propertyIds: string[],
  startDate: string,
  endDate: string,
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", "100");
  params.set("include", "guest,properties");
  params.set("date_query", "checkin");
  params.set("start_date", startDate);
  params.set("end_date", endDate);
  for (const id of propertyIds) {
    params.append("properties[]", id);
  }
  return `/reservations?${params.toString()}`;
}

/** Hospitable defaults to upcoming stays if we omit dates. Chunk so history fits. */
function reservationDateWindows(): Array<{ start: string; end: string }> {
  const horizonEnd = addUtcDays(utcToday(), 540);
  let cursor = addUtcDays(utcToday(), -365 * 4);
  const windows: Array<{ start: string; end: string }> = [];
  while (cursor < horizonEnd) {
    const next = addUtcDays(cursor, 180);
    windows.push({
      start: cursor,
      end: next < horizonEnd ? next : horizonEnd,
    });
    cursor = next;
  }
  return windows;
}

export async function syncHospitableReservations(companyId: string) {
  const propertyIds = (await listHospitableProperties(companyId)).map(
    (p) => p.id,
  );
  if (!propertyIds.length) {
    throw new Error(
      "No Hospitable listings found. Test the connection or sync properties first.",
    );
  }

  let imported = 0;
  for (const window of reservationDateWindows()) {
    let page = 1;
    for (;;) {
      const json = await hospitableFetch(
        companyId,
        reservationListPath(page, propertyIds, window.start, window.end),
      );
      const batch = paginatedItems<HospitableReservationPayload>(json);
      if (!batch.length) break;
      for (const row of batch) {
        await ingestHospitableReservation(companyId, row);
        imported += 1;
      }
      const totalPages = (json as Paginated<unknown>)?.meta?.pagination
        ?.total_pages;
      if (totalPages && page >= totalPages) break;
      if (batch.length < 100) break;
      page += 1;
    }
  }
  return imported;
}

function guestPhone(
  guest: HospitableReservationPayload["guest"],
): string | null {
  if (guest?.phone?.trim()) return guest.phone.trim();
  const first = guest?.phone_numbers?.[0];
  if (typeof first === "string" && first.trim()) return first.trim();
  if (first && typeof first === "object" && first.number?.trim()) {
    return first.number.trim();
  }
  return null;
}

function reservationPropertyId(
  payload: HospitableReservationPayload,
): string | null {
  if (payload.property_id) return payload.property_id;
  const nested = payload.properties?.[0];
  const id = nested?.id ?? nested?.uuid;
  return id ? String(id) : null;
}

export async function ingestHospitableReservation(
  companyId: string,
  payload: HospitableReservationPayload,
) {
  const hospitableId = payload.id ?? payload.uuid;
  if (!hospitableId) return;
  const supabase = createServiceClient();
  const guestEmail = payload.guest?.email?.trim().toLowerCase() ?? null;
  const phone = guestPhone(payload.guest);
  const hospitableGuestId =
    payload.guest?.id != null ? String(payload.guest.id) : null;
  let guestId: string | null = null;

  if (guestEmail || phone || payload.guest?.first_name || hospitableGuestId) {
    const status = guestEmail ? "captured" : "stub";
    let existing: {
      id: string;
      email: string | null;
      trust_status: string;
    } | null = null;
    if (guestEmail) {
      const { data } = await supabase
        .from("guests")
        .select("id, email, trust_status")
        .eq("company_id", companyId)
        .ilike("email", guestEmail)
        .maybeSingle();
      existing = data;
    }
    if (!existing && hospitableGuestId) {
      const { data } = await supabase
        .from("guests")
        .select("id, email, trust_status")
        .eq("company_id", companyId)
        .eq("hospitable_guest_id", hospitableGuestId)
        .limit(1);
      existing = data?.[0] ?? null;
    }

    const optedIn = Boolean(
      payload.guest?.marketing_opt_in ?? payload.guest?.opted_in,
    );
    if (existing) {
      guestId = existing.id;
      await supabase
        .from("guests")
        .update({
          email: existing.email ? undefined : (guestEmail ?? undefined),
          phone: phone ?? undefined,
          first_name: payload.guest?.first_name ?? undefined,
          last_name: payload.guest?.last_name ?? undefined,
          hospitable_guest_id: hospitableGuestId ?? undefined,
          opted_in: optedIn ? true : undefined,
          trust_status:
            existing.trust_status === "stub" && guestEmail
              ? "captured"
              : existing.trust_status,
        })
        .eq("id", existing.id);
    } else {
      const { data: created } = await supabase
        .from("guests")
        .insert({
          company_id: companyId,
          email: guestEmail,
          phone,
          first_name: payload.guest?.first_name ?? null,
          last_name: payload.guest?.last_name ?? null,
          trust_status: status,
          opted_in: optedIn,
          source: payload.platform === "airbnb" ? "airbnb" : "hospitable",
          hospitable_guest_id: hospitableGuestId,
        })
        .select("id")
        .single();
      guestId = created?.id ?? null;
    }
  }

  const propertyUuid = reservationPropertyId(payload);
  const { data: property } = propertyUuid
    ? await supabase
        .from("properties")
        .select("id")
        .eq("company_id", companyId)
        .eq("hospitable_property_id", propertyUuid)
        .maybeSingle()
    : { data: null };

  await supabase.from("hospitable_reservations").upsert(
    {
      company_id: companyId,
      property_id: property?.id ?? null,
      guest_id: guestId,
      hospitable_id: hospitableId,
      platform: payload.platform ?? null,
      status: reservationStatus(payload),
      check_in:
        (payload.arrival_date ?? payload.check_in ?? "").slice(0, 10) || null,
      check_out:
        (payload.departure_date ?? payload.check_out ?? "").slice(0, 10) ||
        null,
      payload: JSON.parse(JSON.stringify(payload)),
    },
    { onConflict: "company_id,hospitable_id" },
  );
}

export async function listReservationMessages(
  companyId: string,
  reservationId: string,
): Promise<Record<string, unknown>[]> {
  const json = await hospitableFetch(
    companyId,
    `/reservations/${encodeURIComponent(reservationId)}/messages?per_page=50`,
  );
  return paginatedItems<Record<string, unknown>>(json);
}

export function verifyHospitableWebhook(
  rawBody: string,
  secret: string,
  headers: Headers,
) {
  const signature = headers.get("signature") ?? headers.get("Signature");
  if (signature) {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  const authz = headers.get("authorization");
  return authz === `Bearer ${secret}`;
}
