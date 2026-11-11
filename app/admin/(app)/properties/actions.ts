"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { seedPropertyPages } from "@/lib/cms";
import { requirePermission } from "@/lib/company";
import { formError, formOk, type FormState } from "@/lib/form-state";
import { slugify } from "@/lib/properties";
import { createServiceClient } from "@/lib/supabase/service";

async function insertProperty(input: {
  companyId: string;
  name: string;
  locationName: string | null;
  hospitablePropertyId: string | null;
}) {
  const supabase = createServiceClient();
  const slug = slugify(input.name);
  const { data, error } = await supabase
    .from("properties")
    .insert({
      company_id: input.companyId,
      name: input.name,
      slug,
      status: "draft",
      location_name: input.locationName,
      hospitable_property_id: input.hospitablePropertyId,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not create.");
  }
  await seedPropertyPages(input.companyId, data.id, input.name);
  return data.id;
}

export async function createProperty(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("property:write");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return formError("Name is required.");
  try {
    const id = await insertProperty({
      companyId: company.id,
      name,
      locationName: String(formData.get("location_name") ?? "").trim() || null,
      hospitablePropertyId: null,
    });
    redirect(`/admin/properties/${id}?notice=created`);
  } catch (error) {
    return formError(error instanceof Error ? error.message : "Could not create.");
  }
}

export async function updateProperty(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("property:write");
  const id = String(formData.get("id") ?? "");
  const amenities = String(formData.get("amenities") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("properties")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      slug: slugify(String(formData.get("slug") ?? "")),
      status: String(formData.get("status") ?? "draft"),
      headline: String(formData.get("headline") ?? "") || null,
      summary: String(formData.get("summary") ?? "") || null,
      location_name: String(formData.get("location_name") ?? "") || null,
      bedrooms: Number(formData.get("bedrooms") || 0) || null,
      sleeps: Number(formData.get("sleeps") || 0) || null,
      latitude: Number(formData.get("latitude") || 0) || null,
      longitude: Number(formData.get("longitude") || 0) || null,
      cleaning_fee_cents: Math.round(
        Number(formData.get("cleaning_fee") || 0) * 100,
      ),
      amenities,
      house_rules: String(formData.get("house_rules") ?? "") || null,
      airbnb_url: String(formData.get("airbnb_url") ?? "") || null,
      hospitable_property_id:
        String(formData.get("hospitable_property_id") ?? "") || null,
      pricelabs_listing_id:
        String(formData.get("pricelabs_listing_id") ?? "") || null,
      airdna_listing_id:
        String(formData.get("airdna_listing_id") ?? "") || null,
      airdna_market_id: String(formData.get("airdna_market_id") ?? "") || null,
    })
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) return formError(error.message);
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
  return formOk();
}

export async function deleteProperty(id: string): Promise<FormState> {
  const company = await requirePermission("property:write");
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id)
    .eq("company_id", company.id);
  if (count) {
    return formError("This property has bookings and cannot be deleted.");
  }
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) return formError(error.message);
  revalidatePath("/admin/properties");
  return formOk();
}
