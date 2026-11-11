import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  can,
  isAppRole,
  type AppRole,
  type Permission,
} from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/service";
import { parseTheme, type ThemeTokens } from "@/lib/theme";

export type ActiveCompany = {
  id: string;
  name: string;
  slug: string;
  role: AppRole;
  authOrgId: string;
  wordmark: string | null;
  theme: ThemeTokens;
};

export async function getActiveCompany(): Promise<ActiveCompany | null> {
  const session = await getSession();
  if (!session) return null;

  const requestHeaders = await headers();
  let orgId = session.session.activeOrganizationId ?? null;

  if (!orgId) {
    try {
      const orgs = await auth.api.listOrganizations({
        headers: requestHeaders,
      });
      orgId = orgs?.[0]?.id ?? null;
      if (orgId) {
        await auth.api.setActiveOrganization({
          headers: requestHeaders,
          body: { organizationId: orgId },
        });
      }
    } catch {
      return null;
    }
  }

  if (!orgId) return null;

  const supabase = createServiceClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug, wordmark, theme")
    .eq("auth_org_id", orgId)
    .maybeSingle();

  if (error || !company) return null;

  let role: AppRole = "viewer";
  try {
    const member = await auth.api.getActiveMember({ headers: requestHeaders });
    const raw = member && "role" in member ? String(member.role) : "";
    if (isAppRole(raw.split(",")[0] ?? "")) {
      role = raw.split(",")[0] as AppRole;
    }
  } catch {
    role = "viewer";
  }

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    role,
    authOrgId: orgId,
    wordmark: company.wordmark,
    theme: parseTheme(company.theme),
  };
}

export async function requirePermission(permission: Permission) {
  const company = await getActiveCompany();
  if (!company) redirect("/admin/login");
  if (!can(company.role, permission)) redirect("/admin");
  return company;
}
