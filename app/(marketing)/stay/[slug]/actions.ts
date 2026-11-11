"use server";

import {
  confirmStayGuest,
  createStayGuest,
  findCompanyGuestByEmail,
  parseStayGuestDraft,
  toStayGuestMatch,
  type StayGuestDraft,
  type StayGuestMatch,
} from "@/lib/guest-register";
import { getPublishedProperty } from "@/lib/properties";
import { resolveTenant } from "@/lib/tenant";

export type StayRegisterState = {
  error: string | null;
  step: "form" | "confirm" | "success";
  trusted: boolean;
  draft: StayGuestDraft | null;
  match: StayGuestMatch | null;
};

const initial = {
  error: null,
  step: "form" as const,
  trusted: false,
  draft: null,
  match: null,
};

async function stayContext(slug: string) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const property = await getPublishedProperty(tenant.id, slug);
  if (!property) return null;
  return { tenant, property };
}

export async function registerStayGuestAction(
  _prev: StayRegisterState,
  formData: FormData,
): Promise<StayRegisterState> {
  const slug = String(formData.get("property") ?? "");
  const context = await stayContext(slug);
  if (!context) return { ...initial, error: "This property is not available." };
  const { tenant, property } = context;
  const draft = parseStayGuestDraft(formData);
  if (typeof draft === "string") return { ...initial, error: draft };

  try {
    const existing = await findCompanyGuestByEmail(tenant.id, draft.email);
    if (existing?.incident_flag) {
      return {
        ...initial,
        error: "Please contact the host about this stay.",
        draft,
      };
    }
    if (existing) {
      return {
        error: null,
        step: "confirm",
        trusted: existing.trust_status === "trusted",
        draft,
        match: toStayGuestMatch(existing),
      };
    }
    await createStayGuest(tenant.id, property.id, draft);
    return {
      error: null,
      step: "success",
      trusted: false,
      draft,
      match: null,
    };
  } catch (error) {
    return {
      ...initial,
      error: error instanceof Error ? error.message : "Could not save.",
      draft,
    };
  }
}

export async function confirmStayGuestAction(
  _prev: StayRegisterState,
  formData: FormData,
): Promise<StayRegisterState> {
  const slug = String(formData.get("property") ?? "");
  const guestId = String(formData.get("guestId") ?? "");
  const context = await stayContext(slug);
  if (!context) return { ...initial, error: "This property is not available." };
  const { tenant, property } = context;
  const draft = parseStayGuestDraft(formData);
  if (typeof draft === "string") return { ...initial, error: draft };

  try {
    const trusted = await confirmStayGuest(
      tenant.id,
      property.id,
      guestId,
      draft,
    );
    return {
      error: null,
      step: "success",
      trusted,
      draft,
      match: null,
    };
  } catch (error) {
    return {
      ...initial,
      error: error instanceof Error ? error.message : "Could not confirm.",
      draft,
    };
  }
}
