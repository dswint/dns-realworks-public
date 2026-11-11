import Link from "next/link";

import { BookLink } from "@/components/marketing/book-link";
import { Wordmark } from "@/components/marketing/wordmark";
import type { PublicTenant } from "@/lib/tenant";

export function SiteHeader({ tenant }: { tenant: PublicTenant }) {
  return (
    <header className="border-border/80 bg-background/90 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Wordmark name={tenant.wordmark} sub={tenant.wordmarkSub} />
        <nav className="text-muted-foreground hidden items-center gap-6 text-sm md:flex">
          <Link href="/properties" className="hover:text-foreground">
            Properties
          </Link>
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/account" className="hover:text-foreground">
            Account
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Admin
          </Link>
          <BookLink />
        </div>
      </div>
    </header>
  );
}
