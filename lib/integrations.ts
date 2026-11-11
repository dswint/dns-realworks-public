import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

export type IntegrationProvider =
  "hospitable" | "pricelabs" | "airdna" | "stripe" | "airbnb";

export type IntegrationAccount = {
  id: string;
  company_id: string;
  provider: string;
  status: string;
  credentials: Record<string, string>;
  metadata: Record<string, unknown>;
};

function asRecord(value: Json): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

export async function getIntegration(
  companyId: string,
  provider: IntegrationProvider,
): Promise<IntegrationAccount | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integration_accounts")
    .select("*")
    .eq("company_id", companyId)
    .eq("provider", provider)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    company_id: data.company_id,
    provider: data.provider,
    status: data.status,
    credentials: asRecord(data.credentials),
    metadata:
      data.metadata &&
      typeof data.metadata === "object" &&
      !Array.isArray(data.metadata)
        ? (data.metadata as Record<string, unknown>)
        : {},
  };
}

export async function upsertIntegration(
  companyId: string,
  provider: IntegrationProvider,
  credentials: Record<string, string>,
) {
  const supabase = createServiceClient();
  const existing = await getIntegration(companyId, provider);
  const merged = { ...(existing?.credentials ?? {}), ...credentials };
  for (const [key, value] of Object.entries(merged)) {
    if (!value.trim()) delete merged[key];
  }
  const connected = Boolean(merged.token);
  await supabase.from("integration_accounts").upsert(
    {
      company_id: companyId,
      provider,
      status: connected ? "connected" : "disconnected",
      credentials: merged,
    },
    { onConflict: "company_id,provider" },
  );
}

export async function listIntegrations(companyId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("integration_accounts")
    .select("id, provider, status, updated_at")
    .eq("company_id", companyId);
  return data ?? [];
}
