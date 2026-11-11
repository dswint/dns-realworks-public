import Stripe from "stripe";

/** Stable Checkout label for Dashboard comparison. Suffix is fixed, not per-request. */
export const DIRECT_BOOKING_INTEGRATION_ID = "direct_booking_rwstay01";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return new Stripe(key, {
    apiVersion: "2026-10-28.endive",
    typescript: true,
  });
}

export function checkoutPaymentIntentId(
  session: Stripe.Checkout.Session,
): string | null {
  const paymentIntent = session.payment_intent;
  if (typeof paymentIntent === "string") return paymentIntent;
  return paymentIntent?.id ?? null;
}

export function isPaidCheckoutSession(session: Stripe.Checkout.Session) {
  return session.payment_status === "paid";
}
