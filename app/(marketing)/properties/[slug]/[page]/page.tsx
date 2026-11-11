import Link from "next/link";
import { notFound } from "next/navigation";

import { BlockList } from "@/components/marketing/blocks";
import { BookingBar } from "@/components/marketing/booking-bar";
import { PropertyNav } from "@/components/marketing/property-nav";
import {
  PROPERTY_PAGE_LABELS,
  PROPERTY_PAGE_SLUGS,
  getPropertyPage,
} from "@/lib/cms";
import { listMedia, mediaPublicUrl } from "@/lib/media";
import { getPublishedProperty } from "@/lib/properties";
import { resolveTenant } from "@/lib/tenant";

export default async function PropertySubpage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const { slug, page: pageSlug } = await params;
  if (
    !PROPERTY_PAGE_SLUGS.includes(
      pageSlug as (typeof PROPERTY_PAGE_SLUGS)[number],
    ) ||
    pageSlug === "overview"
  ) {
    notFound();
  }
  const property = await getPublishedProperty(tenant.id, slug);
  if (!property) notFound();
  const page = await getPropertyPage(tenant.id, property.id, pageSlug);
  const photos =
    pageSlug === "gallery" ? await listMedia(tenant.id, property.id) : [];

  return (
    <div className="-mx-4 sm:-mx-6">
      <PropertyNav slug={slug} current={pageSlug} />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <nav className="text-muted-foreground text-sm">
          <Link href="/properties" className="hover:text-foreground">
            Properties
          </Link>
          <span> / </span>
          <Link href={`/properties/${slug}`} className="hover:text-foreground">
            {property.name}
          </Link>
          <span> / </span>
          <span className="text-foreground">
            {
              PROPERTY_PAGE_LABELS[
                pageSlug as (typeof PROPERTY_PAGE_SLUGS)[number]
              ]
            }
          </span>
        </nav>
        {pageSlug === "gallery" && photos.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {photos.map((asset) => (
              <li key={asset.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaPublicUrl(asset.storage_path)}
                  alt={asset.alt_text}
                  className="photo h-64 w-full rounded-xl object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
        {pageSlug === "location" &&
        (property.location_name ||
          (property.latitude != null && property.longitude != null)) ? (
          <div className="space-y-3">
            {property.location_name ? (
              <h1 className="text-4xl">{property.location_name}</h1>
            ) : null}
            {property.latitude != null && property.longitude != null ? (
              <p>
                <a
                  className="underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open map
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
        {pageSlug === "amenities" && property.amenities.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {property.amenities.map((item) => (
              <li
                key={item}
                className="bg-card ring-foreground/10 rounded-lg px-4 py-3 ring-1"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {pageSlug === "stay" && property.house_rules ? (
          <p className="text-muted-foreground max-w-2xl whitespace-pre-wrap">
            {property.house_rules}
          </p>
        ) : null}
        {page ? (
          <BlockList page={page} />
        ) : (
          <h1 className="text-4xl">
            {
              PROPERTY_PAGE_LABELS[
                pageSlug as (typeof PROPERTY_PAGE_SLUGS)[number]
              ]
            }
          </h1>
        )}
      </div>
      <BookingBar slug={property.slug} />
    </div>
  );
}
