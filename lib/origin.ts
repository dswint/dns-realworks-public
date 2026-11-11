export const PRODUCTION_ORIGIN = "https://www.dnsrealworks.com";

export function publicSiteOrigin(customDomain: string | null) {
  if (!customDomain) return siteOrigin();
  const host = customDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const bare = host.replace(/^www\./, "");
  const productionBare = new URL(PRODUCTION_ORIGIN).host.replace(/^www\./, "");
  if (bare === productionBare) return PRODUCTION_ORIGIN;
  return `https://${host}`;
}

export function propertyStayRegisterUrl(
  customDomain: string | null,
  slug: string,
) {
  return `${publicSiteOrigin(customDomain)}/stay/${encodeURIComponent(slug)}`;
}

export function siteOrigin() {
  // Production serves the custom domain; Vercel env may still point at *.vercel.app.
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_ORIGIN;
  }

  const configured = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.BETTER_AUTH_URL ||
    ""
  ).replace(/\/$/, "");
  if (configured) return configured;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}
