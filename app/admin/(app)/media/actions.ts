"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/company";
import { formError, formOk, type FormState } from "@/lib/form-state";
import { deleteMediaAsset, uploadMedia } from "@/lib/media";

export async function uploadMediaAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const company = await requirePermission("page:write");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return formError("Choose a file to upload.");
  }
  const propertyId = String(formData.get("property_id") ?? "") || null;
  const altText = String(formData.get("alt_text") ?? "");
  try {
    await uploadMedia({
      companyId: company.id,
      propertyId,
      file,
      altText,
    });
  } catch (error) {
    return formError(error instanceof Error ? error.message : "Upload failed.");
  }
  revalidatePath("/admin/media");
  revalidatePath("/admin/properties");
  return formOk();
}

export async function deleteMediaAction(id: string): Promise<FormState> {
  const company = await requirePermission("page:write");
  try {
    await deleteMediaAsset(company.id, id);
  } catch (error) {
    return formError(
      error instanceof Error ? error.message : "Could not delete.",
    );
  }
  revalidatePath("/admin/media");
  revalidatePath("/admin/properties");
  return formOk();
}
