import Link from "next/link";

import { saveIntegrationAction } from "@/app/admin/(app)/integrations/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { HospitableIntegrationPanel } from "@/components/admin/hospitable-integration-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveCompany } from "@/lib/company";
import { listIntegrations } from "@/lib/integrations";
import { listHospitableProperties } from "@/lib/hospitable";
import { siteOrigin } from "@/lib/origin";

const PROVIDERS = [
  {
    id: "hospitable",
    label: "Hospitable",
    hint: "Personal access token with Read + Write. Powers calendar, guest ingest, and direct-booking write-back. Guest replies stay in Hospitable Inbox AI.",
  },
  { id: "pricelabs", label: "PriceLabs", hint: "Customer API key" },
  { id: "airdna", label: "AirDNA", hint: "Enterprise Bearer token" },
] as const;

export default async function IntegrationsAdmin() {
  const company = await getActiveCompany();
  if (!company) return null;
  const rows = await listIntegrations(company.id);
  const byProvider = Object.fromEntries(rows.map((row) => [row.provider, row]));
  const hospitableConnected = byProvider.hospitable?.status === "connected";
  const webhookUrl = `${siteOrigin()}/api/webhooks/hospitable/${company.id}`;
  const hospitableProperties = hospitableConnected
    ? await listHospitableProperties(company.id).catch(() => [])
    : [];

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl">Integrations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Per-tenant credentials. Hospitable is the calendar and reservation
          source of truth for the booking flow.
        </p>
      </div>
      {PROVIDERS.map((provider) => (
        <ActionForm
          key={provider.id}
          action={saveIntegrationAction}
          success={`${provider.label} saved.`}
          className="bg-card ring-foreground/10 space-y-3 rounded-xl p-4 ring-1"
        >
          <input type="hidden" name="provider" value={provider.id} />
          <h2 className="font-medium">{provider.label}</h2>
          <p className="text-muted-foreground text-xs">
            {provider.hint}. Status:{" "}
            {byProvider[provider.id]?.status ?? "disconnected"}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${provider.id}-token`}>API token</Label>
            <Input
              id={`${provider.id}-token`}
              name="token"
              type="password"
              autoComplete="off"
              placeholder={
                byProvider[provider.id]?.status === "connected"
                  ? "Leave blank to keep current token"
                  : undefined
              }
            />
          </div>
          {provider.id === "hospitable" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hospitable-webhook">Webhook secret (optional)</Label>
                <Input
                  id="hospitable-webhook"
                  name="webhook_secret"
                  type="password"
                  autoComplete="off"
                  placeholder="Used for Signature or Bearer checks"
                />
              </div>
              <HospitableIntegrationPanel
                webhookUrl={webhookUrl}
                connected={hospitableConnected}
              />
              {hospitableProperties.length ? (
                <p className="text-muted-foreground text-xs">
                  {hospitableProperties.length} listing
                  {hospitableProperties.length === 1 ? "" : "s"} in Hospitable.
                  New ones appear on{" "}
                  <Link href="/admin/properties" className="underline">
                    Properties
                  </Link>{" "}
                  when you save the token or test the connection.
                </p>
              ) : null}
            </>
          ) : null}
          <SubmitButton size="sm">Save</SubmitButton>
        </ActionForm>
      ))}
      <p className="text-muted-foreground text-xs">
        Company id: {company.id}
      </p>
    </div>
  );
}
