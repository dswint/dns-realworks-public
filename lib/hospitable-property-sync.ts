import { seedPropertyPages } from "@/lib/cms";
import { listHospitableProperties } from "@/lib/hospitable";
import { slugify } from "@/lib/properties";
import { createServiceClient } from "@/lib/supabase/service";

export type HospitablePropertySyncResult = {
  created: number;
  total: number;
  alreadyLinked: number;
};

export async function importMissingHospitableProperties(
  companyId: string,
): Promise<HospitablePropertySyncResult> {
  const list = await listHospitableProperties(companyId);
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("properties")
    .select("hospitable_property_id, slug")
    .eq("company_id", companyId);

  const linked = new Set(
    (rows ?? [])
      .map((row) => row.hospitable_property_id)
      .filter((id): id is string => Boolean(id)),
  );
  const slugs = new Set((rows ?? []).map((row) => row.slug));

  let created = 0;
  for (const row of list) {
    if (linked.has(row.id)) continue;
    const name = row.publicName || row.name;
    let slug = slugify(name);
    let suffix = 2;
    while (slugs.has(slug)) {
      slug = `${slugify(name)}-${suffix}`;
      suffix += 1;
    }
    slugs.add(slug);

    const { data, error } = await supabase
      .from("properties")
      .insert({
        company_id: companyId,
        name,
        slug,
        status: "draft",
        location_name: null,
        hospitable_property_id: row.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? `Could not import ${name}.`);
    }
    await seedPropertyPages(companyId, data.id, name);
    linked.add(row.id);
    created += 1;
  }

  return {
    created,
    total: list.length,
    alreadyLinked: list.length - created,
  };
}
