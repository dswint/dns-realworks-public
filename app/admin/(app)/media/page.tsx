import {
  deleteMediaAction,
  uploadMediaAction,
} from "@/app/admin/(app)/media/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getActiveCompany } from "@/lib/company";
import { listMedia, mediaPublicUrl } from "@/lib/media";
import { listAdminProperties } from "@/lib/properties";

export default async function MediaAdmin() {
  const company = await getActiveCompany();
  if (!company) return null;
  const [assets, properties] = await Promise.all([
    listMedia(company.id),
    listAdminProperties(company.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-3xl">Media</h1>
      <p className="text-muted-foreground text-sm">
        Files are stored at <code>/{company.id}/…</code> in the media bucket.
      </p>
      <ActionForm
        action={uploadMediaAction}
        success="Uploaded."
        className="bg-card ring-foreground/10 grid gap-3 rounded-xl p-4 ring-1"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Upload</Label>
          <Input id="file" name="file" type="file" accept="image/*" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="alt_text">Alt text</Label>
          <Input id="alt_text" name="alt_text" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="property_id">Property (optional)</Label>
          <select
            id="property_id"
            name="property_id"
            className="border-input h-9 rounded-lg border bg-transparent px-2 text-sm"
          >
            <option value="">Brand / unassigned</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
      </ActionForm>
      <ul className="grid gap-4 sm:grid-cols-2">
        {assets.map((asset) => (
          <li
            key={asset.id}
            className="bg-card ring-foreground/10 overflow-hidden rounded-xl ring-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaPublicUrl(asset.storage_path)}
              alt={asset.alt_text}
              className="photo h-40 w-full object-cover"
            />
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <p className="text-muted-foreground truncate text-xs">
                {asset.storage_path}
              </p>
              <ConfirmActionButton
                action={deleteMediaAction.bind(null, asset.id)}
                message="Delete this file from the media library?"
                success="Media deleted."
                variant="destructive"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
