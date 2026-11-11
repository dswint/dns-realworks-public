import Link from "next/link";

import { DateSearch } from "@/components/marketing/date-search";
import { PropertySearchCard } from "@/components/marketing/property-search-card";
import { filterOpenProperties } from "@/lib/availability";
import { isValidStayRange } from "@/lib/dates";
import { listPublishedProperties } from "@/lib/properties";
import { resolveTenant } from "@/lib/tenant";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>;
}) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const params = await searchParams;
  const all = await listPublishedProperties(tenant.id);
  const hasRange =
    params.checkIn &&
    params.checkOut &&
    isValidStayRange(params.checkIn, params.checkOut);
  const open = hasRange
    ? await filterOpenProperties(
        tenant.id,
        all,
        params.checkIn!,
        params.checkOut!,
      )
    : [];
  const defaultGuests = params.guests ? Number(params.guests) : 2;

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
          Collection
        </p>
        <h1 className="mt-3 text-4xl">Properties</h1>
        <p className="text-muted-foreground mt-3">
          Choose dates first — we only show homes that are open for your stay
          (Hospitable calendar).
        </p>
      </header>
      <DateSearch
        defaultCheckIn={params.checkIn}
        defaultCheckOut={params.checkOut}
        defaultGuests={defaultGuests}
      />
      {hasRange ? (
        <p className="text-muted-foreground text-sm">
          {open.length} of {all.length}{" "}
          {open.length === 1 ? "property is" : "properties are"} open{" "}
          {params.checkIn} – {params.checkOut}
          {params.guests ? ` · ${params.guests} guests` : ""}.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Enter arrive and depart to search availability across the collection.
        </p>
      )}
      {!hasRange && all.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2">
          {all.map((property) => (
            <li key={property.id}>
              <Link
                href={`/properties/${property.slug}`}
                className="bg-card ring-foreground/10 block rounded-2xl p-6 ring-1"
              >
                <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
                  {property.location_name ?? "Stay"}
                </p>
                <h2 className="mt-2 text-2xl">{property.name}</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  View the availability calendar, then add dates above to
                  search the collection.
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {hasRange && open.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing open for those nights. Try different dates or shorten your
          stay.
        </p>
      ) : null}
      {hasRange && open.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2">
          {open.map((property) => (
            <PropertySearchCard
              key={property.id}
              companyId={tenant.id}
              property={property}
              checkIn={params.checkIn!}
              checkOut={params.checkOut!}
              guests={params.guests}
            />
          ))}
        </ul>
      ) : null}
      {!hasRange && all.length === 0 ? (
        <p className="text-muted-foreground">No published properties yet.</p>
      ) : null}
    </div>
  );
}
