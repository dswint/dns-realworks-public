import { BlockList } from "@/components/marketing/blocks";
import { getBrandPage } from "@/lib/cms";
import { resolveTenant } from "@/lib/tenant";

export default async function ContactPage() {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const page = await getBrandPage(tenant.id, "contact");
  if (!page) return <h1 className="text-4xl">Contact</h1>;
  return (
    <div className="space-y-8">
      <BlockList page={page} />
      {tenant.email ? (
        <p className="text-muted-foreground text-sm">
          {tenant.email}
          {tenant.phone ? ` · ${tenant.phone}` : ""}
        </p>
      ) : null}
    </div>
  );
}
