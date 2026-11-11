import { randomUUID } from "crypto";

import { createServiceClient } from "@/lib/supabase/service";

export type MediaAsset = {
  id: string;
  company_id: string;
  property_id: string | null;
  storage_path: string;
  alt_text: string;
  caption: string | null;
  mime_type: string | null;
  file_size: number | null;
};

export function mediaPublicUrl(storagePath: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return "";
  return `${base}/storage/v1/object/public/media/${storagePath}`;
}

export async function listMedia(companyId: string, propertyId?: string) {
  const supabase = createServiceClient();
  let query = supabase
    .from("media_assets")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data } = await query;
  return (data ?? []) as MediaAsset[];
}

export async function uploadMedia(input: {
  companyId: string;
  propertyId?: string | null;
  file: File;
  altText: string;
}) {
  const supabase = createServiceClient();
  const safeName = input.file.name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 80);
  const storagePath = `${input.companyId}/${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, buffer, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      company_id: input.companyId,
      property_id: input.propertyId || null,
      storage_path: storagePath,
      alt_text: input.altText || input.file.name,
      mime_type: input.file.type || null,
      file_size: input.file.size,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as MediaAsset;
}

export async function deleteMediaAsset(companyId: string, id: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, storage_path")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Media not found.");
  const { error: storageError } = await supabase.storage
    .from("media")
    .remove([data.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error: deleteError } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (deleteError) throw new Error(deleteError.message);
}
