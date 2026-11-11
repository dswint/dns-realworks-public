import Link from "next/link";

import {
  requestMagicLinkAction,
  signOutGuestAction,
} from "@/app/(marketing)/account/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canUseDirectBook,
  getGuestSession,
  safeGuestNext,
} from "@/lib/guests";
import { cn } from "@/lib/utils";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveTenant } from "@/lib/tenant";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const params = await searchParams;
  const next = safeGuestNext(params.next ?? null);
  const guest = await getGuestSession(tenant.id);
  const canBook = canUseDirectBook(guest);
  const supabase = createServiceClient();
  const { data: bookings } = guest
    ? await supabase
        .from("bookings")
        .select("id, status, check_in, check_out")
        .eq("guest_id", guest.id)
        .order("check_in", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="text-4xl">Guest account</h1>
      {params.notice === "sent" ? (
        <p className="text-muted-foreground text-sm">
          If we have a record of that email, a sign-in link is on its way.
        </p>
      ) : null}
      {guest ? (
        <div className="space-y-6">
          <p>
            Signed in as {guest.email ?? "guest"}. Trust: {guest.trust_status}
            {canBook ? " — you can book direct." : "."}
          </p>
          {!canBook ? (
            <p className="text-muted-foreground text-sm">
              Direct booking on this site is for returning guests. After your
              first stay with us, the team can enable direct book on your
              account.
            </p>
          ) : null}
          {canBook && next ? (
            <Link href={next} className={cn(buttonVariants({ size: "lg" }))}>
              Continue booking
            </Link>
          ) : null}
          <ul className="space-y-2 text-sm">
            {(bookings ?? []).map((booking) => (
              <li key={booking.id}>
                {booking.check_in} → {booking.check_out} · {booking.status}
              </li>
            ))}
          </ul>
          <form action={signOutGuestAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <form action={requestMagicLinkAction} className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Use the email from a completed stay with us. Direct booking is not
            available for first-time guests on this site.
          </p>
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <Button type="submit">Send sign-in link</Button>
        </form>
      )}
    </div>
  );
}
