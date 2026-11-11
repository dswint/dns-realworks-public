import {
  deleteProperty,
  updateProperty,
} from "@/app/admin/(app)/properties/actions";
import { HouseGuideDrafts } from "@/components/admin/house-guide-drafts";
import { PropertyStayQr } from "@/components/admin/property-stay-qr";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getAirdnaSnapshot,
  propertyActuals,
  recommendAction,
  withPosition,
  type AirDnaMetrics,
} from "@/lib/airdna";
import { listAdminPages } from "@/lib/cms";
import { getActiveCompany } from "@/lib/company";
import {
  countUncheckedMessages,
  listPendingHouseGuideDrafts,
} from "@/lib/house-guide";
import { formatPercent } from "@/lib/money";
import { getIntegration } from "@/lib/integrations";
import { listHospitableProperties } from "@/lib/hospitable";
import { getAdminProperty } from "@/lib/properties";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PropertyAdminDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const company = await getActiveCompany();
  if (!company) return null;
  const { id } = await params;
  const property = await getAdminProperty(company.id, id);
  if (!property) notFound();
  const pages = await listAdminPages(company.id, property.id);
  const snapshot = await getAirdnaSnapshot(property.id);
  const actuals = await propertyActuals(company.id, property.id);
  const metrics = withPosition(
    (snapshot?.metrics ?? {}) as AirDnaMetrics,
    actuals,
  );
  const action = recommendAction(metrics);
  const occPct = metrics.occupancyPercentile;
  const adrPct = metrics.adrPercentile;
  const hospitableAccount = await getIntegration(company.id, "hospitable");
  const hospitableProperties = hospitableAccount?.credentials.token
    ? await listHospitableProperties(company.id).catch(() => [])
    : [];
  const [drafts, unchecked] = await Promise.all([
    listPendingHouseGuideDrafts(company.id, property.id),
    countUncheckedMessages(company.id, property.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="space-y-2">
        <Link
          href="/admin/properties"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← Back to properties
        </Link>
        <h1 className="text-3xl">{property.name}</h1>
      </div>

      <PropertyStayQr
        companyId={company.id}
        slug={property.slug}
        published={property.status === "published"}
      />

      <Card>
        <CardHeader>
          <CardTitle>Market position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            {property.bedrooms ?? "–"}-bed
            {metrics.marketName ? ` in ${metrics.marketName}` : ""} — occupancy{" "}
            {occPct != null
              ? `${Math.round(occPct * 100)}th percentile`
              : formatPercent(actuals.occupancy)}
            , ADR{" "}
            {adrPct != null
              ? `${Math.round(adrPct * 100)}th percentile`
              : actuals.adr
                ? `$${Math.round(actuals.adr)}`
                : "n/a"}
            .
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi
              label="Occupancy LTM"
              value={formatPercent(actuals.occupancy)}
              vs={metrics.marketOccupancyP50}
              actual={actuals.occupancy}
            />
            <Kpi
              label="ADR LTM"
              value={actuals.adr ? `$${Math.round(actuals.adr)}` : "—"}
              vs={metrics.marketAdrP50}
              actual={actuals.adr}
            />
            <Kpi
              label="RevPAR LTM"
              value={actuals.revpar ? `$${Math.round(actuals.revpar)}` : "—"}
              vs={metrics.marketRevparP50}
              actual={actuals.revpar}
            />
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="font-medium">{action.headline}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {action.detail}
            </p>
          </div>
          {metrics.comps?.length ? (
            <details>
              <summary className="cursor-pointer text-sm">Comps</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {metrics.comps.map((comp, index) => (
                  <li key={index}>
                    {comp.name} · occ {formatPercent(comp.occupancy ?? 0)} · ADR
                    ${Math.round(comp.adr ?? 0)}
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <p className="text-muted-foreground text-xs">
              Connect AirDNA and set listing/market IDs, then run the nightly
              snapshot cron.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            <a
              className="underline"
              href="https://app.airdna.co/"
              target="_blank"
              rel="noreferrer"
            >
              Open AirDNA
            </a>{" "}
            for the full spreadsheet.
          </p>
        </CardContent>
      </Card>

      <ActionForm
        action={updateProperty}
        success="Property saved."
        className="grid gap-4"
      >
        <input type="hidden" name="id" value={property.id} />
        <Field label="Name" name="name" defaultValue={property.name} />
        <Field label="Slug" name="slug" defaultValue={property.slug} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={property.status}
            className="border-input h-9 rounded-lg border bg-transparent px-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </div>
        <Field
          label="Headline"
          name="headline"
          defaultValue={property.headline ?? ""}
        />
        <Field
          label="Location"
          name="location_name"
          defaultValue={property.location_name ?? ""}
        />
        <Field
          label="Bedrooms"
          name="bedrooms"
          defaultValue={property.bedrooms?.toString() ?? ""}
        />
        <Field
          label="Sleeps"
          name="sleeps"
          defaultValue={property.sleeps?.toString() ?? ""}
        />
        <Field
          label="Latitude"
          name="latitude"
          defaultValue={property.latitude?.toString() ?? ""}
        />
        <Field
          label="Longitude"
          name="longitude"
          defaultValue={property.longitude?.toString() ?? ""}
        />
        <Field
          label="Cleaning fee (USD)"
          name="cleaning_fee"
          defaultValue={(property.cleaning_fee_cents / 100).toString()}
        />
        <Field
          label="Amenities (comma separated)"
          name="amenities"
          defaultValue={property.amenities.join(", ")}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="house_rules">House guide</Label>
          <Textarea
            id="house_rules"
            name="house_rules"
            defaultValue={property.house_rules ?? ""}
          />
          <p className="text-muted-foreground text-xs">
            Guests read this on the House guide page. Publishing a draft appends
            to this text.
          </p>
        </div>
        <Field
          label="Airbnb URL"
          name="airbnb_url"
          defaultValue={property.airbnb_url ?? ""}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Hospitable property</span>
          {hospitableProperties.length ? (
            <select
              id="hospitable_property_id"
              name="hospitable_property_id"
              defaultValue={property.hospitable_property_id ?? ""}
              className="border-input h-9 rounded-lg border bg-transparent px-2 text-sm"
            >
              <option value="">Not linked</option>
              {hospitableProperties.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.id.slice(0, 8)}…
                </option>
              ))}
              {property.hospitable_property_id &&
              !hospitableProperties.some(
                (row) => row.id === property.hospitable_property_id,
              ) ? (
                <option value={property.hospitable_property_id}>
                  Current · {property.hospitable_property_id}
                </option>
              ) : null}
            </select>
          ) : (
            <Input
              id="hospitable_property_id"
              name="hospitable_property_id"
              defaultValue={property.hospitable_property_id ?? ""}
              placeholder="Connect Hospitable under Integrations first"
            />
          )}
          <span className="text-muted-foreground text-xs">
            Required for live calendar checks and Stripe → Hospitable
            write-back.
          </span>
        </label>
        <Field
          label="PriceLabs listing ID"
          name="pricelabs_listing_id"
          defaultValue={property.pricelabs_listing_id ?? ""}
        />
        <Field
          label="AirDNA listing ID"
          name="airdna_listing_id"
          defaultValue={property.airdna_listing_id ?? ""}
        />
        <Field
          label="AirDNA market ID"
          name="airdna_market_id"
          defaultValue={property.airdna_market_id ?? ""}
        />
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton>Save property</SubmitButton>
          <ConfirmActionButton
            action={deleteProperty.bind(null, property.id)}
            message={`Delete ${property.name}? Pages and media links for this property will be removed. Bookings cannot be deleted.`}
            success="Property deleted."
            href="/admin/properties"
            variant="destructive"
          />
        </div>
      </ActionForm>

      <HouseGuideDrafts
        propertyId={property.id}
        drafts={drafts}
        unchecked={unchecked}
      />

      <section>
        <h2 className="text-xl">Page tree</h2>
        <ul className="mt-3 text-sm">
          {pages.map((page) => (
            <li key={page.id}>
              {page.slug} · {page.status} · {page.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}

function Kpi({
  label,
  value,
  vs,
  actual,
}: {
  label: string;
  value: string;
  vs?: number;
  actual: number;
}) {
  const delta =
    vs != null && vs !== 0
      ? `${actual - vs > 0 ? "+" : ""}${Math.round((actual - vs) * 100) / 100} vs market`
      : "vs market n/a";
  return (
    <div className="bg-secondary rounded-xl p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-xl">{value}</p>
      <p className="text-muted-foreground text-xs">{delta}</p>
    </div>
  );
}
