import { createServiceClient } from "@/lib/supabase/service";
import type { GuestRow } from "@/types/database";

export type StayGuestDraft = {
  fullName: string;
  email: string;
  phone: string;
};

export type StayGuestMatch = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function parseStayGuestDraft(
  formData: FormData,
): StayGuestDraft | string {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const { firstName, lastName } = splitFullName(fullName);
  if (!firstName || !lastName) return "Enter your first and last name.";
  if (!EMAIL.test(email)) return "Enter a valid email.";
  if (phone.replace(/\D/g, "").length < 7) return "Enter a phone number.";
  return { fullName, email, phone };
}

function displayName(
  guest: Pick<GuestRow, "first_name" | "last_name" | "email">,
) {
  return (
    [guest.first_name, guest.last_name].filter(Boolean).join(" ") ||
    guest.email ||
    "Guest"
  );
}

export async function findCompanyGuestByEmail(
  companyId: string,
  email: string,
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("company_id", companyId)
    .ilike("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GuestRow | null) ?? null;
}

export function toStayGuestMatch(guest: GuestRow): StayGuestMatch {
  return {
    id: guest.id,
    fullName: displayName(guest),
    email: guest.email ?? "",
    phone: guest.phone,
  };
}

async function linkGuestToProperty(
  companyId: string,
  propertyId: string,
  guestId: string,
) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("guest_registrations").upsert(
    {
      company_id: companyId,
      property_id: propertyId,
      guest_id: guestId,
    },
    { onConflict: "guest_id,property_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

export async function createStayGuest(
  companyId: string,
  propertyId: string,
  draft: StayGuestDraft,
) {
  const { firstName, lastName } = splitFullName(draft.fullName);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("guests")
    .insert({
      company_id: companyId,
      email: draft.email,
      phone: draft.phone,
      first_name: firstName,
      last_name: lastName,
      trust_status: "captured",
      source: "direct",
      opted_in: false,
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(error?.message ?? "Could not save guest.");
  await linkGuestToProperty(companyId, propertyId, data.id);
}

export async function confirmStayGuest(
  companyId: string,
  propertyId: string,
  guestId: string,
  draft: StayGuestDraft,
) {
  const existing = await findCompanyGuestByEmail(companyId, draft.email);
  if (!existing || existing.id !== guestId) {
    throw new Error("That guest record no longer matches this email.");
  }
  if (existing.incident_flag) {
    throw new Error("Please contact the host about this stay.");
  }
  const { firstName, lastName } = splitFullName(draft.fullName);
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("guests")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: draft.phone,
      trust_status:
        existing.trust_status === "stub" ? "captured" : existing.trust_status,
    })
    .eq("id", existing.id)
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);
  await linkGuestToProperty(companyId, propertyId, existing.id);
  return existing.trust_status === "trusted";
}
