import Link from "next/link";

import { BlockList } from "@/components/marketing/blocks";
import { DateSearch } from "@/components/marketing/date-search";
import { getBrandPage } from "@/lib/cms";
import { listPublishedProperties } from "@/lib/properties";
import { resolveTenant } from "@/lib/tenant";

export default async function HomePage() {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const page = await getBrandPage(tenant.id, "home");
  const properties = await listPublishedProperties(tenant.id);

  return (
    <div className="space-y-16">
      {page ? (
        <BlockList page={page} />
      ) : (
        <h1 className="text-5xl">{tenant.wordmark}</h1>
      )}
      <DateSearch />
      <p className="text-muted-foreground -mt-10 text-sm">
        Search runs across the whole collection — you&apos;ll only see homes open
        for your dates.
      </p>
      <section>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl">The collection</h2>
          <Link
            href="/properties"
            className="text-sm underline-offset-4 hover:underline"
          >
            All properties
          </Link>
        </div>
        {properties.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Properties will appear here once they are published.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {properties.map((property) => (
              <li key={property.id}>
                <Link
                  href={`/properties/${property.slug}`}
                  className="bg-card ring-foreground/10 hover:ring-foreground/20 block rounded-2xl p-6 ring-1 transition"
                >
                  <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
                    {property.location_name ?? "Stay"}
                  </p>
                  <h3 className="mt-2 text-2xl">{property.name}</h3>
                  {property.headline ? (
                    <p className="text-muted-foreground mt-2 text-sm">
                      {property.headline}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
