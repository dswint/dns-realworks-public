import Link from "next/link";

import type { PublicTenant } from "@/lib/tenant";

export function SiteFooter({ tenant }: { tenant: PublicTenant }) {
  return (
    <footer className="border-border mt-auto border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          {tenant.wordmark}
          {tenant.wordmarkSub ? ` · ${tenant.wordmarkSub}` : ""}
        </p>
        <div className="flex gap-4">
          <Link href="/properties" className="hover:text-foreground">
            Properties
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
