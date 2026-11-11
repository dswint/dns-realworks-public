"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/company";
import { formError, formOk, type FormState } from "@/lib/form-state";
import { createServiceClient } from "@/lib/supabase/service";

export async function savePageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("page:write");
  const id = String(formData.get("id") ?? "");
  const { error } = await createServiceClient()
    .from("pages")
    .update({
      title: String(formData.get("title") ?? ""),
      status: String(formData.get("status") ?? "draft"),
    })
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) return formError(error.message);
  revalidatePath("/admin/pages");
  return formOk();
}

export async function saveBlockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("page:write");
  const id = String(formData.get("id") ?? "");
  const { error } = await createServiceClient()
    .from("blocks")
    .update({
      type: String(formData.get("type") ?? "richText"),
      data: {
        eyebrow: String(formData.get("eyebrow") ?? ""),
        title: String(formData.get("title") ?? ""),
        body: String(formData.get("body") ?? ""),
      },
    })
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) return formError(error.message);
  revalidatePath("/admin/pages");
  return formOk();
}

export async function addBlockAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("page:write");
  const pageId = String(formData.get("page_id") ?? "");
  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", pageId)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!page) return formError("Page not found.");
  const { count } = await supabase
    .from("blocks")
    .select("id", { count: "exact", head: true })
    .eq("page_id", pageId);
  const { error } = await supabase.from("blocks").insert({
    company_id: company.id,
    page_id: pageId,
    type: "richText",
    position: count ?? 0,
    data: { title: "New block", body: "" },
  });
  if (error) return formError(error.message);
  revalidatePath("/admin/pages");
  return formOk();
}

export async function deleteBlockAction(id: string): Promise<FormState> {
  const company = await requirePermission("page:write");
  const { error } = await createServiceClient()
    .from("blocks")
    .delete()
    .eq("id", id)
    .eq("company_id", company.id);
  if (error) return formError(error.message);
  revalidatePath("/admin/pages");
  return formOk();
}
