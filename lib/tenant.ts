import { headers } from "next/headers";
import { cache } from "react";

import { hasServiceClient, createServiceClient } from "@/lib/supabase/service";
import { parseTheme, type ThemeTokens } from "@/lib/theme";

export type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  wordmark: string;
  wordmarkSub: string | null;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  logoPath: string | null;
  theme: ThemeTokens;
};

function normalizeHost(host: string) {
  return (
    host
      .split(":")[0]
      ?.toLowerCase()
      .replace(/^www\./, "") ?? ""
  );
}

export const resolveTenant = cache(
  async function resolveTenant(): Promise<PublicTenant | null> {
    if (!hasServiceClient()) return null;
    const headerStore = await headers();
    const host = normalizeHost(headerStore.get("host") ?? "");
    const fallback = process.env.DEV_FALLBACK_COMPANY_SLUG ?? "dns-realworks";
    const supabase = createServiceClient();

    if (host) {
      const byDomain = await supabase
        .from("companies")
        .select(
          "id, name, slug, custom_domain, wordmark, wordmark_sub, tagline, email, phone, logo_path, theme, status",
        )
        .eq("status", "active")
        .eq("custom_domain", host)
        .maybeSingle();
      if (byDomain.data) return mapTenant(byDomain.data);

      const slugGuess = host.split(".")[0];
      if (slugGuess && host.includes(".")) {
        const bySlugHost = await supabase
          .from("companies")
          .select(
            "id, name, slug, custom_domain, wordmark, wordmark_sub, tagline, email, phone, logo_path, theme, status",
          )
          .eq("status", "active")
          .eq("slug", slugGuess)
          .maybeSingle();
        if (bySlugHost.data) return mapTenant(bySlugHost.data);
      }
    }

    const { data } = await supabase
      .from("companies")
      .select(
        "id, name, slug, custom_domain, wordmark, wordmark_sub, tagline, email, phone, logo_path, theme, status",
      )
      .eq("status", "active")
      .eq("slug", fallback)
      .maybeSingle();

    return data ? mapTenant(data) : null;
  },
);

function mapTenant(row: {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  wordmark: string | null;
  wordmark_sub: string | null;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  logo_path: string | null;
  theme: unknown;
}): PublicTenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    customDomain: row.custom_domain,
    wordmark: row.wordmark || row.name,
    wordmarkSub: row.wordmark_sub,
    tagline: row.tagline,
    email: row.email,
    phone: row.phone,
    logoPath: row.logo_path,
    theme: parseTheme(row.theme),
  };
}
