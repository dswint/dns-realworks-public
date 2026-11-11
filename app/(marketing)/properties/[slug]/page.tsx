import Link from "next/link";

import { BlockList } from "@/components/marketing/blocks";
import { BookingBar } from "@/components/marketing/booking-bar";
import { PropertyBookingCalendar } from "@/components/marketing/property-booking-calendar";
import { PropertyNav } from "@/components/marketing/property-nav";
import { fetchPropertyStayCalendar } from "@/lib/availability";
import { canUseDirectBook, getGuestSession } from "@/lib/guests";
import { getPropertyPage } from "@/lib/cms";
import { listMedia, mediaPublicUrl } from "@/lib/media";
import { siteOrigin } from "@/lib/origin";
import { sampleFromRate } from "@/lib/pricelabs";
import {
  getPublishedProperty,
  listPublishedProperties,
} from "@/lib/properties";
import { lodgingBusinessJsonLd } from "@/lib/schema";
import { resolveTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";

export default async function PropertyHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>;
}) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const { slug } = await params;
  const query = await searchParams;
  const property = await getPublishedProperty(tenant.id, slug);
  if (!property) notFound();
  const calendarDays = await fetchPropertyStayCalendar(tenant.id, property);
  const calendarPayload = calendarDays.map((day) => ({
    date: day.date,
    available: day.available,
  }));
  const defaultGuests = query.guests ? Number(query.guests) : 2;
  const guest = await getGuestSession(tenant.id);
  const canBookDirect = canUseDirectBook(guest);
  const page = await getPropertyPage(tenant.id, property.id, "overview");
  const related = (await listPublishedProperties(tenant.id)).filter(
    (item) => item.id !== property.id,
  );
  const fromCents = await sampleFromRate(property.id);
  const photos = await listMedia(tenant.id, property.id);

  return (
    <div className="-mx-4 sm:-mx-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(lodgingBusinessJsonLd(siteOrigin(), property)),
        }}
      />
      <PropertyNav slug={slug} current="overview" />
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl flex-1">
            <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
              {property.location_name ?? tenant.wordmark}
            </p>
            <h1 className="mt-3 text-4xl sm:text-5xl">{property.name}</h1>
            {property.headline ? (
              <p className="text-muted-foreground mt-4 text-lg">
                {property.headline}
              </p>
            ) : null}
          </div>
          <PropertyBookingCalendar
            slug={property.slug}
            days={calendarPayload}
            initialCheckIn={query.checkIn}
            initialCheckOut={query.checkOut}
            initialGuests={defaultGuests}
            canBookDirect={canBookDirect}
            airbnbUrl={property.airbnb_url}
          />
        </div>
        {photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaPublicUrl(photos[0].storage_path)}
            alt={photos[0].alt_text}
            className="photo h-80 w-full rounded-2xl object-cover"
          />
        ) : null}
        {page ? <BlockList page={page} /> : null}
        {property.airbnb_url ? (
          <p className="text-muted-foreground text-sm">
            New here? You can also{" "}
            <a className="underline" href={property.airbnb_url}>
              request a stay on Airbnb
            </a>
            .
          </p>
        ) : null}
        {related.length ? (
          <section>
            <h2 className="text-2xl">More of the collection</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/properties/${item.slug}`}
                    className="hover:text-primary text-lg"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <BookingBar
        slug={property.slug}
        fromCents={fromCents}
        currency={property.currency}
      />
    </div>
  );
}
