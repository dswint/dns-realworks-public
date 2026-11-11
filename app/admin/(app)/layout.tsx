import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Wordmark } from "@/components/marketing/wordmark";
import { getActiveCompany } from "@/lib/company";
import { requireEmployee } from "@/lib/session";

export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireEmployee();
  const company = await getActiveCompany();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-card flex flex-col gap-4 border-b p-4 md:w-60 md:border-r md:border-b-0 md:p-6">
        <Wordmark
          name={company?.wordmark || company?.name || "Admin"}
          href="/admin"
        />
        {company ? (
          <p className="text-muted-foreground text-xs capitalize">
            {company.role}
          </p>
        ) : null}
        <AdminNav />
        <div className="mt-auto space-y-2">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground block text-sm"
          >
            View website
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        {company ? (
          children
        ) : (
          <div className="mx-auto max-w-md py-16 text-center">
            <h1 className="text-xl">No company access yet</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Seed tenant zero and register the first owner.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
