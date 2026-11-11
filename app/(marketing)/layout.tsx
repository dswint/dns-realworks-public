import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { resolveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await resolveTenant();
  if (!tenant) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 text-center">
        <h1 className="text-3xl">No tenant on this host</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Seed a company (slug <code>dns-realworks</code>) and set Supabase env
          vars.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader tenant={tenant} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        {children}
      </main>
      <SiteFooter tenant={tenant} />
    </div>
  );
}
