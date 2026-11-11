import { randomUUID } from "crypto";

import { auth } from "@/lib/auth";
import { getPool, setUserAdminRole } from "@/lib/db";
import { sessionHeaders } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/service";

type SeededCompany = {
  id: string;
  name: string;
  slug: string;
};

export async function bootstrapOwner(userId: string, token: string | null) {
  const supabase = createServiceClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !company) {
    throw new Error(
      "No company seeded. Run supabase db reset or deploy_all.sql.",
    );
  }

  await setUserAdminRole(userId);

  const seeded = company as SeededCompany;
  const headers = token ? sessionHeaders(token) : null;
  let orgId: string | null = null;

  if (headers) {
    try {
      const org = await auth.api.createOrganization({
        body: { name: seeded.name, slug: seeded.slug },
        headers,
      });
      orgId = org?.id ?? null;
      if (orgId) {
        await auth.api.setActiveOrganization({
          body: { organizationId: orgId },
          headers,
        });
      }
    } catch {
      orgId = null;
    }
  }

  if (!orgId) {
    orgId = await insertOrgAndOwner(seeded, userId);
  }

  const { error: linkError } = await supabase
    .from("companies")
    .update({ auth_org_id: orgId })
    .eq("id", seeded.id);

  if (linkError) {
    throw new Error(linkError.message);
  }
}

async function insertOrgAndOwner(company: SeededCompany, userId: string) {
  const orgId = randomUUID();
  const memberId = randomUUID();
  const pool = getPool();

  await pool.query(
    `insert into "organization" ("id", "name", "slug", "createdAt")
     values ($1, $2, $3, now())`,
    [orgId, company.name, company.slug],
  );
  await pool.query(
    `insert into "member" ("id", "organizationId", "userId", "role", "createdAt")
     values ($1, $2, $3, 'owner', now())`,
    [memberId, orgId, userId],
  );
  await pool.query(
    `update "session" set "activeOrganizationId" = $1 where "userId" = $2`,
    [orgId, userId],
  );

  return orgId;
}
