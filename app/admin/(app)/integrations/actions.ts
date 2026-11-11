"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/company";
import { formError, formOk, type FormState } from "@/lib/form-state";
import { importMissingHospitableProperties } from "@/lib/hospitable-property-sync";
import {
  getIntegration,
  upsertIntegration,
  type IntegrationProvider,
} from "@/lib/integrations";

export async function saveIntegrationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("integration:write");
  const provider = String(
    formData.get("provider") ?? "",
  ) as IntegrationProvider;
  const token = String(formData.get("token") ?? "").trim();
  const webhookSecret = String(formData.get("webhook_secret") ?? "").trim();
  if (!["hospitable", "pricelabs", "airdna"].includes(provider)) {
    return formError("Unknown provider.");
  }
  const credentials: Record<string, string> = {};
  if (token) credentials.token = token;
  if (webhookSecret) credentials.webhook_secret = webhookSecret;
  try {
    await upsertIntegration(company.id, provider, credentials);
  } catch (error) {
    return formError(
      error instanceof Error ? error.message : "Could not save.",
    );
  }
  revalidatePath("/admin/integrations");

  if (provider === "hospitable") {
    const account = await getIntegration(company.id, "hospitable");
    if (account?.credentials.token) {
      try {
        const sync = await importMissingHospitableProperties(company.id);
        revalidatePath("/admin/properties");
        if (sync.created > 0) {
          return formOk(
            `Saved. Imported ${sync.created} new ${sync.created === 1 ? "property" : "properties"} from Hospitable.`,
          );
        }
        return formOk(
          `${sync.total} Hospitable ${sync.total === 1 ? "listing" : "listings"} already on the site.`,
        );
      } catch (error) {
        return formError(
          error instanceof Error
            ? error.message
            : "Token saved but property import failed.",
        );
      }
    }
  }

  return formOk();
}
