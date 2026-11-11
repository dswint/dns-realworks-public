import {
  addBlockAction,
  deleteBlockAction,
  saveBlockAction,
  savePageAction,
} from "@/app/admin/(app)/pages/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getActiveCompany } from "@/lib/company";
import { blockText, listAdminPagesWithBlocks } from "@/lib/cms";
import { listAdminProperties } from "@/lib/properties";

export default async function PagesAdmin() {
  const company = await getActiveCompany();
  if (!company) return null;
  const [brandPages, properties] = await Promise.all([
    listAdminPagesWithBlocks(company.id),
    listAdminProperties(company.id),
  ]);
  const propertyPages = await Promise.all(
    properties.map(async (property) => ({
      property,
      pages: await listAdminPagesWithBlocks(company.id, property.id),
    })),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <h1 className="text-3xl">Pages</h1>
      <section>
        <h2 className="text-lg">Brand</h2>
        <PageTable pages={brandPages} />
      </section>
      {propertyPages.map(({ property, pages }) => (
        <section key={property.id}>
          <h2 className="text-lg">{property.name}</h2>
          <PageTable pages={pages} />
        </section>
      ))}
    </div>
  );
}

function PageTable({
  pages,
}: {
  pages: Awaited<ReturnType<typeof listAdminPagesWithBlocks>>;
}) {
  return (
    <ul className="mt-3 space-y-6">
      {pages.map((page) => (
        <li
          key={page.id}
          className="bg-card ring-foreground/10 space-y-4 rounded-xl p-4 ring-1"
        >
          <ActionForm
            action={savePageAction}
            success="Page saved."
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="id" value={page.id} />
            <Input
              name="title"
              defaultValue={page.title}
              className="max-w-xs"
            />
            <select
              name="status"
              defaultValue={page.status}
              className="border-input h-9 rounded-lg border bg-transparent px-2 text-sm"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
            <span className="text-muted-foreground text-xs">{page.slug}</span>
            <SubmitButton size="sm">Save page</SubmitButton>
          </ActionForm>
          <ul className="space-y-3">
            {page.blocks.map((block) => (
              <li key={block.id} className="bg-secondary/50 rounded-lg p-3">
                <ActionForm action={saveBlockAction} className="grid gap-2">
                  <input type="hidden" name="id" value={block.id} />
                  <Input name="type" defaultValue={block.type} />
                  <Input
                    name="eyebrow"
                    placeholder="Eyebrow"
                    defaultValue={blockText(block, "eyebrow")}
                  />
                  <Input
                    name="title"
                    placeholder="Title"
                    defaultValue={blockText(block, "title")}
                  />
                  <Textarea
                    name="body"
                    placeholder="Body"
                    defaultValue={blockText(block, "body")}
                  />
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton size="sm" variant="outline">
                      Save block
                    </SubmitButton>
                    <ConfirmActionButton
                      action={deleteBlockAction.bind(null, block.id)}
                      message="Delete this block? This cannot be undone."
                      success="Block deleted."
                      variant="destructive"
                    />
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={addBlockAction} success="Block added.">
            <input type="hidden" name="page_id" value={page.id} />
            <SubmitButton size="sm" variant="ghost" pendingLabel="Adding…">
              Add block
            </SubmitButton>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}
