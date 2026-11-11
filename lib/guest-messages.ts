import { listReservationMessages } from "@/lib/hospitable";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

const IMPORT_RESERVATIONS = 30;

type ParsedMessage = {
  id: string;
  body: string;
  direction: "guest" | "host";
  reservationId: string | null;
  propertyExternalId: string | null;
  source: string | null;
  sentAt: string | null;
  payload: Json;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function directionOf(row: Record<string, unknown>): "guest" | "host" {
  const sender = asRecord(row.sender);
  const user = asRecord(row.user);
  const candidates = [
    row.sender_type,
    row.senderType,
    sender?.type,
    user?.type,
    row.from,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.toLowerCase().includes("guest")) {
      return "guest";
    }
  }
  return "host";
}

function sentAtOf(row: Record<string, unknown>) {
  const raw =
    asText(row.created_at) ?? asText(row.sent_at) ?? asText(row.created);
  if (!raw) return null;
  const time = new Date(raw);
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
}

export function parseHospitableMessage(raw: unknown): ParsedMessage | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asText(row.id) ?? asText(row.uuid);
  const body = asText(row.body) ?? asText(row.content);
  if (!id || !body) return null;
  const reservation = asRecord(row.reservation);
  const property = asRecord(row.property);
  const payload = JSON.parse(JSON.stringify(row)) as Json;
  return {
    id,
    body: body.slice(0, 4000),
    direction: directionOf(row),
    reservationId:
      asText(row.reservation_id) ??
      asText(reservation?.id) ??
      asText(reservation?.uuid),
    propertyExternalId:
      asText(row.property_id) ?? asText(property?.id) ?? asText(property?.uuid),
    source: asText(row.source),
    sentAt: sentAtOf(row),
    payload,
  };
}

async function resolveStay(companyId: string, parsed: ParsedMessage) {
  const supabase = createServiceClient();
  let propertyId: string | null = null;
  let guestId: string | null = null;
  if (parsed.reservationId) {
    const { data } = await supabase
      .from("hospitable_reservations")
      .select("property_id, guest_id")
      .eq("company_id", companyId)
      .eq("hospitable_id", parsed.reservationId)
      .maybeSingle();
    propertyId = data?.property_id ?? null;
    guestId = data?.guest_id ?? null;
  }
  if (!propertyId && parsed.propertyExternalId) {
    const { data } = await supabase
      .from("properties")
      .select("id")
      .eq("company_id", companyId)
      .eq("hospitable_property_id", parsed.propertyExternalId)
      .maybeSingle();
    propertyId = data?.id ?? null;
  }
  return { propertyId, guestId };
}

export async function ingestHospitableMessage(companyId: string, raw: unknown) {
  const parsed = parseHospitableMessage(raw);
  if (!parsed) return { stored: false, propertyId: null as string | null };
  const { propertyId, guestId } = await resolveStay(companyId, parsed);
  const { error } = await createServiceClient().from("guest_messages").upsert(
    {
      company_id: companyId,
      property_id: propertyId,
      guest_id: guestId,
      hospitable_reservation_id: parsed.reservationId,
      hospitable_message_id: parsed.id,
      direction: parsed.direction,
      body: parsed.body,
      source: parsed.source,
      sent_at: parsed.sentAt,
      payload: parsed.payload,
    },
    { onConflict: "company_id,hospitable_message_id" },
  );
  if (error) throw new Error(error.message);
  return { stored: true, propertyId };
}

export async function importRecentHospitableMessages(companyId: string) {
  const { data: reservations, error } = await createServiceClient()
    .from("hospitable_reservations")
    .select("hospitable_id")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(IMPORT_RESERVATIONS);
  if (error) throw new Error(error.message);

  let stored = 0;
  let failed = 0;
  let failure: string | null = null;
  for (const reservation of reservations ?? []) {
    try {
      const messages = await listReservationMessages(
        companyId,
        reservation.hospitable_id,
      );
      for (const message of messages) {
        const result = await ingestHospitableMessage(companyId, {
          ...message,
          reservation_id:
            asText(message.reservation_id) ?? reservation.hospitable_id,
        });
        if (result.stored) stored += 1;
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Import failed.";
      failure ??= message;
      if (message.includes("429")) break;
    }
  }
  if (stored === 0 && failed > 0) {
    throw new Error(failure ?? "Hospitable did not return messages.");
  }
  return {
    reservations: reservations?.length ?? 0,
    stored,
    failed,
    failure,
  };
}

const PAGE_SIZE = 1000;

async function eachPage<T>(
  load: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await load(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
    from += PAGE_SIZE;
  }
}

export type GuestThreadMessage = {
  id: string;
  direction: "guest" | "host";
  body: string;
  sentAt: string | null;
};

export type GuestMessageThread = {
  id: string;
  propertyName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  messages: GuestThreadMessage[];
};

export async function countMessagesByGuest(
  companyId: string,
  guestIds: string[],
) {
  const counts = new Map<string, number>();
  if (!guestIds.length) return counts;
  const rows = await eachPage<{ guest_id: string | null }>((from, to) =>
    createServiceClient()
      .from("guest_messages")
      .select("guest_id")
      .eq("company_id", companyId)
      .in("guest_id", guestIds)
      .order("id")
      .range(from, to),
  );
  for (const row of rows) {
    if (!row.guest_id) continue;
    counts.set(row.guest_id, (counts.get(row.guest_id) ?? 0) + 1);
  }
  return counts;
}

export async function listGuestMessageThreads(
  companyId: string,
  guestId: string,
): Promise<GuestMessageThread[]> {
  const supabase = createServiceClient();
  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", guestId)
    .maybeSingle();
  if (guestError) throw new Error(guestError.message);
  if (!guest) return [];

  const messages = await eachPage<{
    id: string;
    direction: string;
    body: string;
    sent_at: string | null;
    hospitable_reservation_id: string | null;
    property_id: string | null;
  }>((from, to) =>
    supabase
      .from("guest_messages")
      .select(
        "id, direction, body, sent_at, hospitable_reservation_id, property_id",
      )
      .eq("company_id", companyId)
      .eq("guest_id", guestId)
      .order("sent_at", { ascending: true })
      .order("id")
      .range(from, to),
  );
  if (!messages.length) return [];

  const reservationIds = [
    ...new Set(
      messages
        .map((message) => message.hospitable_reservation_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const propertyIds = [
    ...new Set(
      messages
        .map((message) => message.property_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [{ data: reservations }, { data: properties }] = await Promise.all([
    reservationIds.length
      ? supabase
          .from("hospitable_reservations")
          .select("hospitable_id, check_in, check_out, property_id")
          .eq("company_id", companyId)
          .in("hospitable_id", reservationIds)
      : Promise.resolve({ data: [] }),
    propertyIds.length
      ? supabase
          .from("properties")
          .select("id, name")
          .eq("company_id", companyId)
          .in("id", propertyIds)
      : Promise.resolve({ data: [] }),
  ]);
  const reservationById = new Map(
    (reservations ?? []).map((row) => [row.hospitable_id, row]),
  );
  const propertyName = new Map(
    (properties ?? []).map((row) => [row.id, row.name]),
  );

  const groups = new Map<string, GuestMessageThread>();
  for (const message of messages) {
    const key = message.hospitable_reservation_id ?? message.id;
    let thread = groups.get(key);
    if (!thread) {
      const reservation = message.hospitable_reservation_id
        ? reservationById.get(message.hospitable_reservation_id)
        : undefined;
      const propertyId =
        message.property_id ?? reservation?.property_id ?? null;
      thread = {
        id: key,
        propertyName: propertyId
          ? (propertyName.get(propertyId) ?? null)
          : null,
        checkIn: reservation?.check_in ?? null,
        checkOut: reservation?.check_out ?? null,
        messages: [],
      };
      groups.set(key, thread);
    }
    thread.messages.push({
      id: message.id,
      direction: message.direction === "guest" ? "guest" : "host",
      body: message.body,
      sentAt: message.sent_at,
    });
  }

  return [...groups.values()].sort((a, b) => {
    const aTime = a.messages.at(-1)?.sentAt ?? "";
    const bTime = b.messages.at(-1)?.sentAt ?? "";
    return bTime.localeCompare(aTime);
  });
}
