"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/company";
import { formError, formOk, type FormState } from "@/lib/form-state";
import { listGuestMessageThreads } from "@/lib/guest-messages";
import { createServiceClient } from "@/lib/supabase/service";

export async function updateGuestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("guest:write");
  const id = String(formData.get("id") ?? "");
  const trust = String(formData.get("trust_status") ?? "");
  const { error } = await createServiceClient()
    .from("guests")
    .update(
      trust === "trusted"
        ? { trust_status: trust, opted_in: true }
        : { trust_status: trust },
    )
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) return formError(error.message);
  revalidatePath("/admin/guests");
  return formOk();
}

export async function updateGuestContactAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("guest:write");
  const id = String(formData.get("id") ?? "");
  const emailRaw = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const email = emailRaw || null;
  const phone = phoneRaw || null;
  if (email && !email.includes("@")) {
    return formError("Enter a valid email.");
  }

  const supabase = createServiceClient();
  const { data: guest } = await supabase
    .from("guests")
    .select("id, trust_status")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!guest) return formError("Guest not found.");

  const { error } = await supabase
    .from("guests")
    .update({
      email,
      phone,
      trust_status:
        guest.trust_status === "stub" && email
          ? "captured"
          : guest.trust_status,
    })
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) {
    if (error.code === "23505") {
      return formError("Another guest already has that email.");
    }
    return formError(error.message);
  }
  revalidatePath("/admin/guests");
  return formOk();
}

export async function revokeGuestAction(id: string): Promise<FormState> {
  const company = await requirePermission("guest:write");
  const { error } = await createServiceClient()
    .from("guests")
    .update({ trust_status: "revoked" })
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) return formError(error.message);
  revalidatePath("/admin/guests");
  return formOk();
}

export async function listGuestMessagesAction(guestId: string) {
  const company = await requirePermission("guest:read");
  try {
    const threads = await listGuestMessageThreads(company.id, guestId);
    return { error: null, threads };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not load messages.",
      threads: [],
    };
  }
}
