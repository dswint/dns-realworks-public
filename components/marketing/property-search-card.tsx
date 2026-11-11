import Link from "next/link";

import { formatMoney } from "@/lib/money";
import { quoteBooking } from "@/lib/bookings";
import type { PropertyRow } from "@/types/database";

export async function PropertySearchCard({
  companyId,
  property,
  checkIn,
  checkOut,
  guests,
}: {
  companyId: string;
  property: PropertyRow;
  checkIn: string;
  checkOut: string;
  guests?: string;
}) {
  const quote = await quoteBooking(companyId, property, checkIn, checkOut);
  const query = new URLSearchParams({ checkIn, checkOut });
  if (guests) query.set("guests", guests);
  const href = `/properties/${property.slug}?${query.toString()}`;

  return (
    <li>
      <Link
        href={href}
        className="bg-card ring-foreground/10 hover:ring-foreground/20 block rounded-2xl p-6 ring-1 transition"
      >
        <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
          {property.location_name ?? "Stay"}
        </p>
        <h2 className="mt-2 text-2xl">{property.name}</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {[
            property.sleeps ? `Sleeps ${property.sleeps}` : null,
            property.bedrooms != null ? `${property.bedrooms} bed` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {quote.totalCents > 0 ? (
          <p className="mt-3 text-sm font-medium">
            From {formatMoney(quote.totalCents, quote.currency)} for{" "}
            {quote.stayNights} nights
          </p>
        ) : (
          <p className="mt-3 text-sm font-medium">Open for these dates</p>
        )}
      </Link>
    </li>
  );
}
