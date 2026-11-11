import { createServiceClient } from "@/lib/supabase/service";
import type { BlockRow, PageRow } from "@/types/database";

export const BRAND_TEMPLATES = ["home", "inner"] as const;
export const PROPERTY_PAGE_SLUGS = [
  "overview",
  "gallery",
  "amenities",
  "location",
  "stay",
] as const;

export type PropertyPageSlug = (typeof PROPERTY_PAGE_SLUGS)[number];

export const PROPERTY_PAGE_LABELS: Record<PropertyPageSlug, string> = {
  overview: "Overview",
  gallery: "Gallery",
  amenities: "Amenities",
  location: "Location",
  stay: "House guide",
};

export type CmsPage = PageRow & { blocks: BlockRow[] };

export async function getBrandPage(companyId: string, slug: string) {
  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("company_id", companyId)
    .is("property_id", null)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!page) return null;
  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("page_id", page.id)
    .order("position");
  return { ...page, blocks: blocks ?? [] } as CmsPage;
}

export async function getPropertyPage(
  companyId: string,
  propertyId: string,
  slug: string,
) {
  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!page) return null;
  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .eq("page_id", page.id)
    .order("position");
  return { ...page, blocks: blocks ?? [] } as CmsPage;
}

export async function listAdminPages(companyId: string, propertyId?: string) {
  const supabase = createServiceClient();
  let query = supabase
    .from("pages")
    .select("*")
    .eq("company_id", companyId)
    .order("position");
  query = propertyId
    ? query.eq("property_id", propertyId)
    : query.is("property_id", null);
  const { data } = await query;
  return data ?? [];
}

export async function listAdminPagesWithBlocks(
  companyId: string,
  propertyId?: string,
): Promise<CmsPage[]> {
  const pages = await listAdminPages(companyId, propertyId);
  const supabase = createServiceClient();
  const ids = pages.map((page) => page.id);
  if (!ids.length) return [];
  const { data: blocks } = await supabase
    .from("blocks")
    .select("*")
    .in("page_id", ids)
    .order("position");
  const byPage = new Map<string, BlockRow[]>();
  for (const block of (blocks ?? []) as BlockRow[]) {
    const list = byPage.get(block.page_id) ?? [];
    list.push(block);
    byPage.set(block.page_id, list);
  }
  return pages.map((page) => ({
    ...page,
    blocks: byPage.get(page.id) ?? [],
  }));
}

export async function seedPropertyPages(
  companyId: string,
  propertyId: string,
  propertyName: string,
) {
  const supabase = createServiceClient();
  const titles: Record<PropertyPageSlug, string> = {
    overview: propertyName,
    gallery: "Gallery",
    amenities: "Amenities",
    location: "Location",
    stay: "House guide",
  };
  const rows = PROPERTY_PAGE_SLUGS.map((slug, position) => ({
    company_id: companyId,
    property_id: propertyId,
    slug,
    title: titles[slug],
    status: "published" as const,
    template: slug === "overview" ? "property-home" : "property-inner",
    position,
  }));
  await supabase.from("pages").insert(rows);

  const { data: overview } = await supabase
    .from("pages")
    .select("id")
    .eq("property_id", propertyId)
    .eq("slug", "overview")
    .maybeSingle();
  if (overview) {
    await supabase.from("blocks").insert({
      company_id: companyId,
      page_id: overview.id,
      type: "pageIntro",
      position: 0,
      data: {
        title: propertyName,
        body: "A house we own and keep.",
      },
    });
  }
}

export function blockText(block: BlockRow, key: string, fallback = "") {
  const data = block.data as Record<string, unknown>;
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}
