import Link from "next/link";

import {
  createProperty,
  deleteProperty,
} from "@/app/admin/(app)/properties/actions";
import { HospitablePropertySyncButton } from "@/components/admin/hospitable-sync-buttons";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveCompany } from "@/lib/company";
import { getIntegration } from "@/lib/integrations";
import { listAdminProperties } from "@/lib/properties";

export default async function PropertiesAdminPage() {
  const company = await getActiveCompany();
  if (!company) return null;
  const properties = await listAdminProperties(company.id);
  const hospitableConnected =
    (await getIntegration(company.id, "hospitable"))?.credentials.token ?? false;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Properties</h1>
        {hospitableConnected ? <HospitablePropertySyncButton /> : null}
      </div>

      {hospitableConnected ? (
        <p className="text-muted-foreground text-sm">
          Hospitable listings import automatically when you save the API token
          or test the connection. Edit, publish, or delete them here. Use the
          form below only for a property that is not in Hospitable.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Connect Hospitable under{" "}
          <Link href="/admin/integrations" className="underline">
            Integrations
          </Link>{" "}
          to auto-import your listings.
        </p>
      )}

      <ActionForm
        action={createProperty}
        success="Property created."
        className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 ring-1 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Label htmlFor="name">Custom property (optional)</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Only if not in Hospitable"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="location_name">Place</Label>
          <Input
            id="location_name"
            name="location_name"
            placeholder="Hill Country"
          />
        </div>
        <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
      </ActionForm>

      <ul className="divide-border divide-y">
        {properties.map((property) => (
          <li
            key={property.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div>
              <Link
                href={`/admin/properties/${property.id}`}
                className="font-medium hover:underline"
              >
                {property.name}
              </Link>
              <p className="text-muted-foreground text-xs">
                {property.slug} · {property.status}
                {property.hospitable_property_id
                  ? " · from Hospitable"
                  : " · custom"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/properties/${property.slug}`}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                View
              </Link>
              <ConfirmActionButton
                action={deleteProperty.bind(null, property.id)}
                message={`Delete ${property.name}? Pages and media links for this property will be removed. Bookings cannot be deleted.`}
                success="Property deleted."
                variant="destructive"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
