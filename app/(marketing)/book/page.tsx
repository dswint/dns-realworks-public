import Link from "next/link";
import { redirect } from "next/navigation";

import { createCheckoutAction } from "@/app/(marketing)/book/actions";
import { DateSearch } from "@/components/marketing/date-search";
import { PropertyBookingCalendar } from "@/components/marketing/property-booking-calendar";
import { Button } from "@/components/ui/button";
import { fetchPropertyStayCalendar } from "@/lib/availability";
import { eachNight } from "@/lib/dates";
import { canUseDirectBook, getGuestSession } from "@/lib/guests";
import { formatMoney } from "@/lib/money";
import { getPublishedProperty } from "@/lib/properties";
import { resolveTenant } from "@/lib/tenant";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    error?: string;
  }>;
}) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const params = await searchParams;
  const guest = await getGuestSession(tenant.id);
  const canBook = canUseDirectBook(guest);

  if (!params.property) {
    if (params.checkIn && params.checkOut) {
      const q = new URLSearchParams({
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      });
      if (params.guests) q.set("guests", params.guests);
      redirect(`/properties?${q.toString()}`);
    }
    return (
      <div className="space-y-6">
        <h1 className="text-4xl">Book</h1>
        <p className="text-muted-foreground">
          Search by dates to see which homes are open, then book from a property
          page.
        </p>
        <DateSearch />
      </div>
    );
  }

  const property = await getPublishedProperty(tenant.id, params.property);
  if (!property) redirect("/properties");

  if (!canBook) {
    const q = new URLSearchParams();
    if (params.checkIn) q.set("checkIn", params.checkIn);
    if (params.checkOut) q.set("checkOut", params.checkOut);
    if (params.guests) q.set("guests", params.guests);
    const returnTo = q.toString()
      ? `/book?property=${property.slug}&${q.toString()}`
      : `/properties/${property.slug}#availability`;
    redirect(`/account?next=${encodeURIComponent(returnTo)}`);
  }

  if (!params.checkIn || !params.checkOut) {
    redirect(`/properties/${property.slug}#availability`);
  }

  const guests = params.guests ? Number(params.guests) : 2;
  const calendarDays = await fetchPropertyStayCalendar(tenant.id, property);
  const calendarPayload = calendarDays.map((day) => ({
    date: day.date,
    available: day.available,
  }));
  const byDate = new Map(calendarDays.map((day) => [day.date, day]));
  const stayNights = eachNight(params.checkIn, params.checkOut);
  const pricedNights = stayNights.map((date) => byDate.get(date));
  const accommodationCents = pricedNights.reduce(
    (sum, night) => sum + (night?.priceCents ?? 0),
    0,
  );
  const cleaningFeeCents = property.cleaning_fee_cents;
  const totalCents = accommodationCents + cleaningFeeCents;
  const quoteReady =
    pricedNights.every(
      (night) => night?.available && (night.priceCents ?? 0) > 0,
    ) && totalCents > 0;
  const canPay = Boolean(guest) && canBook && quoteReady;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 lg:flex-row lg:items-start">
      <PropertyBookingCalendar
        slug={property.slug}
        days={calendarPayload}
        initialCheckIn={params.checkIn}
        initialCheckOut={params.checkOut}
        initialGuests={Number.isFinite(guests) ? guests : 2}
        canBookDirect={canBook}
        review
      />
      <div className="bg-card ring-foreground/10 w-full max-w-md space-y-4 rounded-2xl p-6 ring-1">
        <div>
          <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
            Confirm and pay
          </p>
          <h1 className="mt-2 text-3xl">{property.name}</h1>
        </div>
        {params.error ? (
          <p className="text-destructive text-sm">{params.error}</p>
        ) : null}
        <p>
          {stayNights.length} nights ·{" "}
          {formatMoney(accommodationCents, property.currency)} lodging
        </p>
        <p className="text-muted-foreground text-sm">
          Cleaning {formatMoney(cleaningFeeCents, property.currency)}
        </p>
        <p className="text-lg font-medium">
          Total {formatMoney(totalCents, property.currency)}
        </p>
        {canPay ? (
          <form action={createCheckoutAction}>
            <input type="hidden" name="property" value={property.slug} />
            <input type="hidden" name="checkIn" value={params.checkIn} />
            <input type="hidden" name="checkOut" value={params.checkOut} />
            <input type="hidden" name="guests" value={params.guests ?? "2"} />
            <Button type="submit" size="lg" className="w-full">
              Pay and confirm
            </Button>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-destructive text-sm">
              Those dates are not fully open or we could not price them.
            </p>
            <Link
              href={`/properties/${property.slug}#availability`}
              className="text-sm underline"
            >
              Choose different dates
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
