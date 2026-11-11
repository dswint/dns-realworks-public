"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/company";
import { formError, type FormState } from "@/lib/form-state";
import {
  syncHospitableReservations,
  testHospitableConnection,
} from "@/lib/hospitable";
import { importMissingHospitableProperties } from "@/lib/hospitable-property-sync";

export type HospitableProbeState = FormState & {
  message?: string | null;
};

export async function testHospitableConnectionAction(): Promise<HospitableProbeState> {
  const company = await requirePermission("integration:write");
  try {
    const result = await testHospitableConnection(company.id);
    const sync = await importMissingHospitableProperties(company.id);
    revalidatePath("/admin/integrations");
    revalidatePath("/admin/properties");
    const importNote =
      sync.created > 0
        ? ` Imported ${sync.created} new ${sync.created === 1 ? "property" : "properties"}.`
        : "";
    return {
      error: null,
      saved: true,
      at: Date.now(),
      message: `Connected. ${result.propertyCount} Hospitable ${result.propertyCount === 1 ? "listing" : "listings"} found.${importNote}`,
    };
  } catch (error) {
    return {
      ...formError(
        error instanceof Error ? error.message : "Connection failed.",
      ),
      message: null,
    };
  }
}

export async function syncHospitablePropertiesAction(): Promise<HospitableProbeState> {
  const company = await requirePermission("integration:write");
  try {
    const sync = await importMissingHospitableProperties(company.id);
    revalidatePath("/admin/properties");
    const message =
      sync.created > 0
        ? `Imported ${sync.created} new ${sync.created === 1 ? "property" : "properties"}.`
        : `All ${sync.total} Hospitable listings are already on the site.`;
    return {
      error: null,
      saved: true,
      at: Date.now(),
      message,
    };
  } catch (error) {
    return {
      ...formError(
        error instanceof Error ? error.message : "Property sync failed.",
      ),
      message: null,
    };
  }
}

export async function syncHospitableReservationsAction(): Promise<HospitableProbeState> {
  const company = await requirePermission("integration:write");
  try {
    const imported = await syncHospitableReservations(company.id);
    revalidatePath("/admin/guests");
    revalidatePath("/admin/bookings");
    return {
      error: null,
      saved: true,
      at: Date.now(),
      message: `Imported ${imported} reservation${imported === 1 ? "" : "s"} from Hospitable.`,
    };
  } catch (error) {
    return {
      ...formError(
        error instanceof Error ? error.message : "Sync failed.",
      ),
      message: null,
    };
  }
}
