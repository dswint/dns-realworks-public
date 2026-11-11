import Link from "next/link";

import { createServiceClient } from "@/lib/supabase/service";
import { resolveTenant } from "@/lib/tenant";

export default async function BookSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const { booking: bookingId } = await searchParams;
  const supabase = createServiceClient();
  const { data: booking } = bookingId
    ? await supabase
        .from("bookings")
        .select("id, status, check_in, check_out, property_id")
        .eq("id", bookingId)
        .eq("company_id", tenant.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-lg space-y-4 py-12">
      <h1 className="text-4xl">You&apos;re booked.</h1>
      <p className="text-muted-foreground">
        {booking
          ? `Status: ${booking.status}. ${booking.check_in} to ${booking.check_out}.`
          : "Payment received. We will email confirmation shortly."}
      </p>
      <Link href="/account" className="underline">
        View your account
      </Link>
    </div>
  );
}
