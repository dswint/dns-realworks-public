"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/company";
import { formError, formOk, type FormState } from "@/lib/form-state";
import { importRecentHospitableMessages } from "@/lib/guest-messages";
import {
  discardHouseGuideDraft,
  draftHouseGuide,
  publishHouseGuideDraft,
} from "@/lib/house-guide";

export async function importHospitableMessagesAction(): Promise<FormState> {
  const company = await requirePermission("integration:write");
  try {
    const result = await importRecentHospitableMessages(company.id);
    revalidatePath("/admin/properties");
    const stopped = result.failure
      ? ` Stopped early: ${result.failure}`
      : result.failed > 0
        ? ` ${result.failed} reservations could not be read.`
        : "";
    return formOk(
      `Saved ${result.stored} messages from ${result.reservations} recent reservations.${stopped}`,
    );
  } catch (error) {
    return formError(error instanceof Error ? error.message : "Import failed.");
  }
}

export async function draftHouseGuideAction(
  propertyId: string,
): Promise<FormState> {
  const company = await requirePermission("property:write");
  try {
    const result = await draftHouseGuide(company.id, propertyId);
    revalidatePath(`/admin/properties/${propertyId}`);
    if (result.checked === 0) {
      return formOk("No new messages for this house.");
    }
    if (result.created === 0) {
      return formOk(
        `Read ${result.checked} messages. Nothing new for the house guide.`,
      );
    }
    return formOk(
      `Drafted ${result.created} house guide ${result.created === 1 ? "update" : "updates"}. They stay unpublished until you publish them.`,
    );
  } catch (error) {
    return formError(error instanceof Error ? error.message : "Draft failed.");
  }
}

export async function publishHouseGuideDraftAction(
  propertyId: string,
  draftId: string,
  title: string,
  body: string,
): Promise<FormState> {
  const company = await requirePermission("property:write");
  try {
    const slug = await publishHouseGuideDraft(company.id, draftId, title, body);
    revalidatePath(`/admin/properties/${propertyId}`);
    revalidatePath(`/properties/${slug}/stay`);
    return formOk("Published to the house guide.");
  } catch (error) {
    return formError(
      error instanceof Error ? error.message : "Publish failed.",
    );
  }
}

export async function discardHouseGuideDraftAction(
  propertyId: string,
  draftId: string,
): Promise<FormState> {
  const company = await requirePermission("property:write");
  try {
    await discardHouseGuideDraft(company.id, draftId);
    revalidatePath(`/admin/properties/${propertyId}`);
    return formOk("Draft discarded.");
  } catch (error) {
    return formError(
      error instanceof Error ? error.message : "Discard failed.",
    );
  }
}
