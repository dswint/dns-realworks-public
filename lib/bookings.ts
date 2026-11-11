import type Stripe from "stripe";

import { isStayOpen } from "@/lib/availability";
import { eachNight } from "@/lib/dates";
import { createManualReservation, getPropertyCalendar } from "@/lib/hospitable";
import { hospitableReservationWriteEnabled } from "@/lib/hospitable-write";
import { logger } from "@/lib/logger";
import { cachedQuote, nightsBetween, type QuotedNight } from "@/lib/pricelabs";
import { siteOrigin } from "@/lib/origin";
import {
  DIRECT_BOOKING_INTEGRATION_ID,
  checkoutPaymentIntentId,
  getStripe,
  isPaidCheckoutSession,
} from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type { GuestRow, PropertyRow } from "@/types/database";

async function quoteFromHospitable(
  companyId: string,
  property: PropertyRow,
  checkIn: string,
  checkOut: string,
): Promise<QuotedNight[] | null> {
  if (!property.hospitable_property_id) return null;
  const days = await getPropertyCalendar(
    companyId,
    property.hospitable_property_id,
    checkIn,
    checkOut,
  );
  const byDate = new Map(days.map((day) => [day.date, day]));
  return eachNight(checkIn, checkOut).map((date) => {
    const day = byDate.get(date);
    return {
      date,
      amountCents: day?.priceCents ?? 0,
      minStay: day?.minStay ?? null,
      available: day?.available ?? false,
    };
  });
}

export async function quoteBooking(
  companyId: string,
  property: PropertyRow,
  checkIn: string,
  checkOut: string,
) {
  let nights: QuotedNight[];
  try {
    nights =
      (await quoteFromHospitable(companyId, property, checkIn, checkOut)) ??
      (await cachedQuote(property.id, checkIn, checkOut));
  } catch {
    nights = await cachedQuote(property.id, checkIn, checkOut);
  }
  const stayNights = nightsBetween(checkIn, checkOut);
  const sliced = nights.filter(
    (night) => night.date >= checkIn && night.date < checkOut,
  );
  const ratesOpen = sliced.every((night) => night.available !== false);
  const stayOpen = await isStayOpen(companyId, property, checkIn, checkOut);
  const available = ratesOpen && stayOpen;
  const accommodation = sliced.reduce(
    (sum, night) => sum + night.amountCents,
    0,
  );
  const cleaning = property.cleaning_fee_cents;
  return {
    nights: sliced,
    stayNights,
    available,
    accommodationCents: accommodation,
    cleaningFeeCents: cleaning,
    totalCents: accommodation + cleaning,
    currency: property.currency,
    incomplete:
      sliced.length !== stayNights ||
      sliced.some((night) => night.amountCents <= 0),
  };
}

export async function createCheckout(input: {
  companyId: string;
  stripeAccountId: string | null;
  property: PropertyRow;
  guest: GuestRow;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
}) {
  const quote = await quoteBooking(
    input.companyId,
    input.property,
    input.checkIn,
    input.checkOut,
  );
  if (!quote.available || quote.incomplete || quote.totalCents <= 0) {
    throw new Error("Those dates are not available to book.");
  }
  const supabase = createServiceClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      company_id: input.companyId,
      property_id: input.property.id,
      guest_id: input.guest.id,
      status: "pending",
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests_count: input.guestsCount,
      currency: quote.currency,
      accommodation_cents: quote.accommodationCents,
      cleaning_fee_cents: quote.cleaningFeeCents,
      total_cents: quote.totalCents,
      quoted_nights: quote.nights,
    })
    .select("*")
    .single();
  if (error || !booking)
    throw new Error(error?.message ?? "Could not create booking.");

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: input.guest.email ?? undefined,
      success_url: `${siteOrigin()}/book/success?booking=${booking.id}&notice=booked`,
      cancel_url: `${siteOrigin()}/book?property=${input.property.slug}&checkIn=${input.checkIn}&checkOut=${input.checkOut}`,
      integration_identifier: DIRECT_BOOKING_INTEGRATION_ID,
      metadata: {
        bookingId: booking.id,
        companyId: input.companyId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: quote.currency.toLowerCase(),
            unit_amount: quote.totalCents,
            product_data: {
              name: `${input.property.name} · ${input.checkIn} to ${input.checkOut}`,
            },
          },
        },
      ],
    },
    {
      idempotencyKey: `booking_checkout_${booking.id}`,
      ...(input.stripeAccountId
        ? { stripeAccount: input.stripeAccountId }
        : {}),
    },
  );

  await supabase
    .from("bookings")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", booking.id);

  return { bookingId: booking.id, url: session.url };
}

export async function fulfillStripeSession(session: Stripe.Checkout.Session) {
  if (!isPaidCheckoutSession(session)) return;
  const bookingId = session.metadata?.bookingId;
  const companyId = session.metadata?.companyId;
  if (!bookingId || !companyId) return;
  const supabase = createServiceClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!booking || booking.status === "confirmed") return;

  if (booking.status !== "paid") {
    await supabase
      .from("bookings")
      .update({
        status: "paid",
        stripe_payment_intent_id: checkoutPaymentIntentId(session),
      })
      .eq("id", booking.id)
      .eq("company_id", companyId);
  }

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", booking.property_id)
    .single();
  const { data: guest } = await supabase
    .from("guests")
    .select("*")
    .eq("id", booking.guest_id)
    .single();

  let hospitableId: string | null = null;
  const mayWrite = hospitableReservationWriteEnabled();
  if (property?.hospitable_property_id && guest && mayWrite) {
    try {
      const created = await createManualReservation(companyId, {
        propertyId: property.hospitable_property_id,
        arrivalDate: booking.check_in,
        departureDate: booking.check_out,
        currency: booking.currency,
        guest: {
          firstName: guest.first_name || "Guest",
          lastName: guest.last_name || "Direct",
          email: guest.email || "",
        },
        guests: { adults: booking.guests_count },
        financials: {
          accommodation: booking.accommodation_cents,
          cleaningFee: booking.cleaning_fee_cents,
        },
      });
      hospitableId = created?.id ?? created?.uuid ?? null;
    } catch (error) {
      logger.error("Hospitable write-back failed", {
        bookingId: booking.id,
        companyId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (property?.hospitable_property_id && guest && !mayWrite) {
    logger.warn(
      "Hospitable write-back skipped (disabled for this environment)",
      {
        bookingId: booking.id,
        companyId,
        vercelEnv: process.env.VERCEL_ENV ?? "local",
      },
    );
  }

  await supabase
    .from("bookings")
    .update({
      status: "confirmed",
      hospitable_reservation_id: hospitableId,
    })
    .eq("id", booking.id)
    .eq("company_id", companyId);
}

export async function failStripeSession(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  const companyId = session.metadata?.companyId;
  if (!bookingId || !companyId) return;
  const supabase = createServiceClient();
  await supabase
    .from("bookings")
    .update({ status: "failed" })
    .eq("id", bookingId)
    .eq("company_id", companyId)
    .eq("status", "pending");
}
