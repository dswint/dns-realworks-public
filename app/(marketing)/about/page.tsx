import { BlockList } from "@/components/marketing/blocks";
import { getBrandPage } from "@/lib/cms";
import { resolveTenant } from "@/lib/tenant";

export default async function AboutPage() {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const page = await getBrandPage(tenant.id, "about");
  if (!page) return <h1 className="text-4xl">About</h1>;
  return <BlockList page={page} />;
}
