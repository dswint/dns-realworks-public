import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

import { sendMail } from "@/lib/mail";
import { siteOrigin } from "@/lib/origin";
import { createServiceClient } from "@/lib/supabase/service";
import type { GuestRow } from "@/types/database";

export const GUEST_COOKIE = "guest_session";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const GUEST_PAGE_SIZE = 50;

const GUEST_TRUST = [
  "stub",
  "captured",
  "invited",
  "trusted",
  "revoked",
] as const;
const GUEST_SOURCES = ["airbnb", "hospitable", "direct", "manual"] as const;
const GUEST_SORTS = [
  "name",
  "updated",
  "created",
  "trust",
  "source",
  "email",
] as const;
const GUEST_CONTACTS = [
  "has_email",
  "missing_email",
  "has_phone",
  "missing_phone",
] as const;

export type GuestListQuery = {
  q?: string;
  trust?: string;
  source?: string;
  contact?: string;
  sort?: string;
  dir?: string;
  page?: string;
};

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
) {
  return value && allowed.includes(value as T) ? (value as T) : undefined;
}

function searchTokens(raw: string | undefined) {
  return (raw ?? "")
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[%_,.()]/g, ""))
    .filter((token) => token.length > 0)
    .slice(0, 5);
}

export async function listGuestsPage(companyId: string, query: GuestListQuery) {
  const trust = oneOf(query.trust, GUEST_TRUST);
  const source = oneOf(query.source, GUEST_SOURCES);
  const contact = oneOf(query.contact, GUEST_CONTACTS);
  const sort = oneOf(query.sort, GUEST_SORTS) ?? "name";
  const ascending = query.dir !== "desc";
  const requested = Number(query.page);
  const page =
    Number.isFinite(requested) && requested > 1 ? Math.floor(requested) : 1;
  const from = (page - 1) * GUEST_PAGE_SIZE;
  const to = from + GUEST_PAGE_SIZE - 1;

  let request = createServiceClient()
    .from("guests")
    .select("*", { count: "exact" })
    .eq("company_id", companyId);

  for (const token of searchTokens(query.q)) {
    const like = `%${token}%`;
    request = request.or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
    );
  }
  if (trust) request = request.eq("trust_status", trust);
  if (source) request = request.eq("source", source);
  if (contact === "has_email") {
    request = request.not("email", "is", null).neq("email", "");
  } else if (contact === "missing_email") {
    request = request.or("email.is.null,email.eq.");
  } else if (contact === "has_phone") {
    request = request.not("phone", "is", null).neq("phone", "");
  } else if (contact === "missing_phone") {
    request = request.or("phone.is.null,phone.eq.");
  }

  const ordered =
    sort === "name"
      ? request
          .order("last_name", { ascending, nullsFirst: false })
          .order("first_name", { ascending, nullsFirst: false })
      : request.order(
          sort === "updated"
            ? "updated_at"
            : sort === "created"
              ? "created_at"
              : sort === "trust"
                ? "trust_status"
                : sort === "source"
                  ? "source"
                  : "email",
          { ascending, nullsFirst: false },
        );

  const { data, count, error } = await ordered.range(from, to);
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    guests: (data ?? []) as GuestRow[],
    total,
    page,
    pageSize: GUEST_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / GUEST_PAGE_SIZE)),
  };
}

export async function getGuestSession(
  companyId: string,
): Promise<GuestRow | null> {
  const store = await cookies();
  const token = store.get(GUEST_COOKIE)?.value;
  if (!token) return null;
  const supabase = createServiceClient();
  const { data: session } = await supabase
    .from("guest_sessions")
    .select("guest_id, expires_at, company_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!session || session.company_id !== companyId) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  const { data: guest } = await supabase
    .from("guests")
    .select("*")
    .eq("id", session.guest_id)
    .maybeSingle();
  return (guest as GuestRow | null) ?? null;
}

export function isTrusted(guest: GuestRow | null) {
  return Boolean(
    guest && guest.trust_status === "trusted" && !guest.incident_flag,
  );
}

/** Direct book / pay on the marketing site — returning guests only (staff-set `trusted`). */
export function canUseDirectBook(guest: GuestRow | null) {
  return isTrusted(guest);
}

export function safeGuestNext(path: string | null | undefined) {
  if (!path?.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

export async function requestMagicLink(
  companyId: string,
  email: string,
  nextPath?: string | null,
) {
  const normalized = email.trim().toLowerCase();
  const supabase = createServiceClient();
  const { data: guest } = await supabase
    .from("guests")
    .select("*")
    .eq("company_id", companyId)
    .ilike("email", normalized)
    .maybeSingle();
  if (!guest) {
    return { ok: true as const };
  }
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  await supabase.from("guest_magic_links").insert({
    company_id: companyId,
    guest_id: guest.id,
    token_hash: hashToken(token),
    expires_at: expires,
  });
  if (guest.trust_status === "captured" || guest.trust_status === "invited") {
    await supabase
      .from("guests")
      .update({ trust_status: "invited" })
      .eq("id", guest.id);
  }
  const next = safeGuestNext(nextPath ?? null);
  const url = next
    ? `${siteOrigin()}/account/verify?token=${token}&next=${encodeURIComponent(next)}`
    : `${siteOrigin()}/account/verify?token=${token}`;
  await sendMail({
    to: normalized,
    subject: "Your guest sign-in link",
    text: `Sign in to manage your stays:\n\n${url}\n\nThis link expires in 24 hours.`,
  });
  return { ok: true as const };
}

export async function consumeMagicLink(token: string) {
  const supabase = createServiceClient();
  const { data: link } = await supabase
    .from("guest_magic_links")
    .select("*")
    .eq("token_hash", hashToken(token))
    .is("consumed_at", null)
    .maybeSingle();
  if (!link || new Date(link.expires_at) < new Date()) return null;

  await supabase
    .from("guest_magic_links")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", link.id);

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await supabase.from("guest_sessions").insert({
    company_id: link.company_id,
    guest_id: link.guest_id,
    token_hash: hashToken(sessionToken),
    expires_at: expires,
  });

  const { data: guest } = await supabase
    .from("guests")
    .select("*")
    .eq("id", link.guest_id)
    .single();

  return { sessionToken, guest: guest as GuestRow };
}

export async function maybeTrustAfterStay(companyId: string, guestId: string) {
  const supabase = createServiceClient();
  const { data: guest } = await supabase
    .from("guests")
    .select("*")
    .eq("id", guestId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!guest || guest.incident_flag || !guest.opted_in || !guest.email) return;
  if (!["captured", "invited"].includes(guest.trust_status)) return;

  const { data: stays } = await supabase
    .from("hospitable_reservations")
    .select("check_out, status")
    .eq("guest_id", guestId)
    .eq("company_id", companyId);
  const completed = (stays ?? []).some(
    (stay) =>
      stay.check_out &&
      new Date(stay.check_out) < new Date() &&
      stay.status !== "cancelled",
  );
  if (!completed) return;

  await requestMagicLink(companyId, guest.email);
}
