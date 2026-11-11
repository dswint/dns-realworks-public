import type { PropertyRow } from "@/types/database";

export function lodgingBusinessJsonLd(origin: string, property: PropertyRow) {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: property.headline ?? property.summary ?? undefined,
    url: `${origin}/properties/${property.slug}`,
    image: undefined,
    numberOfRooms: property.bedrooms ?? undefined,
    occupancy: property.sleeps
      ? { "@type": "QuantitativeValue", value: property.sleeps }
      : undefined,
    address: property.location_name
      ? { "@type": "PostalAddress", addressLocality: property.location_name }
      : undefined,
    geo:
      property.latitude != null && property.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          }
        : undefined,
    sameAs: property.airbnb_url ? [property.airbnb_url] : undefined,
  };
}
