import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function BookingBar({
  slug,
  fromCents,
  currency,
}: {
  slug: string;
  fromCents?: number | null;
  currency?: string;
}) {
  return (
    <div className="border-border bg-card/95 fixed right-0 bottom-0 left-0 z-40 border-t backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            From
          </p>
          <p className="font-medium">
            {fromCents
              ? `${formatMoney(fromCents, currency)} / night`
              : "Select dates"}
          </p>
        </div>
        <Link
          href={`/properties/${slug}#availability`}
          className={cn(buttonVariants())}
        >
          Dates
        </Link>
      </div>
    </div>
  );
}
