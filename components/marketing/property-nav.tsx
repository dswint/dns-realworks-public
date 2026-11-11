import Link from "next/link";

import { PROPERTY_PAGE_LABELS, PROPERTY_PAGE_SLUGS } from "@/lib/cms";
import { cn } from "@/lib/utils";

export function PropertyNav({
  slug,
  current,
}: {
  slug: string;
  current: string;
}) {
  return (
    <div className="border-border bg-background/90 sticky top-16 z-30 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {PROPERTY_PAGE_SLUGS.map((page) => {
          const href =
            page === "overview"
              ? `/properties/${slug}`
              : `/properties/${slug}/${page}`;
          const active = current === page;
          return (
            <Link
              key={page}
              href={href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PROPERTY_PAGE_LABELS[page]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
