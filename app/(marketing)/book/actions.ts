"use server";

import { redirect } from "next/navigation";

import { createCheckout } from "@/lib/bookings";
import { canUseDirectBook, getGuestSession } from "@/lib/guests";
import { getPublishedProperty } from "@/lib/properties";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveTenant } from "@/lib/tenant";

export async function createCheckoutAction(formData: FormData) {
  const tenant = await resolveTenant();
  if (!tenant) redirect("/book?error=No+tenant");
  const guest = await getGuestSession(tenant.id);
  if (!guest || !canUseDirectBook(guest)) {
    redirect("/account?next=/book");
  }
  const slug = String(formData.get("property") ?? "");
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");
  const guestsCount = Number(formData.get("guests") ?? 2);
  const property = await getPublishedProperty(tenant.id, slug);
  if (!property) redirect("/properties");

  const supabase = createServiceClient();
  const { data: company } = await supabase
    .from("companies")
    .select("stripe_account_id")
    .eq("id", tenant.id)
    .single();

  let url: string;
  try {
    const checkout = await createCheckout({
      companyId: tenant.id,
      stripeAccountId: company?.stripe_account_id ?? null,
      property,
      guest,
      checkIn,
      checkOut,
      guestsCount: Number.isFinite(guestsCount) ? guestsCount : 2,
    });
    if (!checkout.url) throw new Error("Stripe did not return a URL.");
    url = checkout.url;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start checkout.";
    redirect(
      `/book?property=${slug}&checkIn=${checkIn}&checkOut=${checkOut}&error=${encodeURIComponent(message)}`,
    );
  }
  redirect(url);
}
