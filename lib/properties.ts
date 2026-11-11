import { createServiceClient } from "@/lib/supabase/service";
import type { PropertyRow } from "@/types/database";

export async function listPublishedProperties(companyId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "published")
    .order("name");
  return (data ?? []) as PropertyRow[];
}

export async function getPublishedProperty(companyId: string, slug: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data as PropertyRow | null;
}

export async function listAdminProperties(companyId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PropertyRow[];
}

export async function getAdminProperty(companyId: string, id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();
  return data as PropertyRow | null;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
