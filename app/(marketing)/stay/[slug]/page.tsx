import { StayRegisterForm } from "@/components/marketing/stay-register-form";
import { getPublishedProperty } from "@/lib/properties";
import { resolveTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";

export default async function StayRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const tenant = await resolveTenant();
  if (!tenant) return null;
  const { slug } = await params;
  const property = await getPublishedProperty(tenant.id, slug);
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header className="space-y-3">
        <p className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
          This stay
        </p>
        <h1 className="text-4xl">{property.name}</h1>
        <p className="text-muted-foreground text-sm">
          Add yourself so we can reach you about this house and direct booking
          on a future stay.
        </p>
      </header>
      <StayRegisterForm
        propertySlug={property.slug}
        propertyName={property.name}
      />
    </div>
  );
}
