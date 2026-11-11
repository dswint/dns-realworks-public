import { generateText, Output } from "ai";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/service";

const HOUSE_GUIDE_MODEL = "openai/gpt-5.4-mini";
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 500;
const MAX_GUIDE_CHARS = 2000;

const draftSchema = z.object({
  updates: z
    .array(
      z.object({
        title: z.string(),
        body: z.string(),
        reason: z.string(),
      }),
    )
    .max(2),
});

function clip(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function guideHasHeading(guide: string, title: string) {
  const heading = title.trim().toLowerCase();
  return guide
    .split("\n")
    .some((line) => line.trim().toLowerCase() === heading);
}

function assertGateway() {
  if (
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.VERCEL
  ) {
    return;
  }
  throw new Error(
    "House guide drafts need AI_GATEWAY_API_KEY. Messages are saved without calling a model.",
  );
}

export async function draftHouseGuide(companyId: string, propertyId: string) {
  const supabase = createServiceClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, name, house_rules")
    .eq("company_id", companyId)
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new Error("Property not found.");

  const { data: messages, error: messageError } = await supabase
    .from("guest_messages")
    .select("id, hospitable_message_id, direction, body, sent_at")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .is("guide_checked_at", null)
    .order("sent_at", { ascending: true })
    .limit(MAX_MESSAGES);
  if (messageError) throw new Error(messageError.message);
  if (!messages?.length) return { created: 0, checked: 0 };

  const { data: pending } = await supabase
    .from("house_guide_drafts")
    .select("title")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .eq("status", "pending");
  const pendingTitles = new Set(
    (pending ?? []).map((row) => row.title.trim().toLowerCase()),
  );
  const guide = property.house_rules ?? "";

  assertGateway();
  const transcript = messages
    .map(
      (message) =>
        `${message.direction}: ${clip(message.body, MAX_MESSAGE_CHARS)}`,
    )
    .join("\n");
  const { output } = await generateText({
    model: HOUSE_GUIDE_MODEL,
    output: Output.object({ schema: draftSchema }),
    system: [
      "You draft a vacation-rental house guide from guest and host messages.",
      "Keep only durable property facts: how something works, checkout, wifi, parking, access, or a local tip that is true for every guest.",
      "Skip one guest's preferences, complaints, incidents, refunds, pricing, payments, and date changes.",
      "Skip anything already in the current house guide or that is not useful to the next guest.",
      "Write plain text. No HTML. If nothing qualifies, return an empty updates list.",
    ].join(" "),
    prompt: [
      `Property: ${property.name}`,
      "",
      "Current house guide:",
      clip(guide, MAX_GUIDE_CHARS) || "(empty)",
      "",
      "Messages:",
      transcript,
    ].join("\n"),
  });
  if (!output) throw new Error("The model returned no house guide draft.");

  const sourceIds = messages.map((message) => message.hospitable_message_id);
  const drafts: Array<{
    company_id: string;
    property_id: string;
    title: string;
    body: string;
    reason: string | null;
    source_message_ids: string[];
  }> = [];
  for (const update of output.updates) {
    const title = update.title.trim().slice(0, 80);
    const body = update.body.trim().slice(0, 1200);
    if (!title || !body) continue;
    const key = title.toLowerCase();
    if (pendingTitles.has(key) || guideHasHeading(guide, title)) continue;
    pendingTitles.add(key);
    drafts.push({
      company_id: companyId,
      property_id: propertyId,
      title,
      body,
      reason: update.reason.trim().slice(0, 240) || null,
      source_message_ids: sourceIds,
    });
  }
  if (drafts.length) {
    const { error } = await supabase.from("house_guide_drafts").insert(drafts);
    if (error) throw new Error(error.message);
  }

  const { error: checkedError } = await supabase
    .from("guest_messages")
    .update({ guide_checked_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .in(
      "id",
      messages.map((message) => message.id),
    );
  if (checkedError) throw new Error(checkedError.message);
  return { created: drafts.length, checked: messages.length };
}

export async function listPendingHouseGuideDrafts(
  companyId: string,
  propertyId: string,
) {
  const { data, error } = await createServiceClient()
    .from("house_guide_drafts")
    .select("id, title, body, reason, created_at")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countUncheckedMessages(
  companyId: string,
  propertyId: string,
) {
  const { count, error } = await createServiceClient()
    .from("guest_messages")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .is("guide_checked_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function publishHouseGuideDraft(
  companyId: string,
  draftId: string,
  title: string,
  body: string,
) {
  const nextTitle = title.trim();
  const nextBody = body.trim();
  if (!nextTitle || !nextBody) {
    throw new Error("A house guide entry needs a title and text.");
  }
  const supabase = createServiceClient();
  const { data: draft, error: draftError } = await supabase
    .from("house_guide_drafts")
    .select("id, property_id, status")
    .eq("company_id", companyId)
    .eq("id", draftId)
    .maybeSingle();
  if (draftError) throw new Error(draftError.message);
  if (!draft || draft.status !== "pending") {
    throw new Error("That draft is no longer pending.");
  }
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, slug, house_rules")
    .eq("company_id", companyId)
    .eq("id", draft.property_id)
    .maybeSingle();
  if (propertyError) throw new Error(propertyError.message);
  if (!property) throw new Error("Property not found.");

  const entry = `${nextTitle}\n${nextBody}`;
  const existing = property.house_rules?.trim() ?? "";
  const houseRules = existing.includes(entry)
    ? existing
    : [existing, entry].filter((part) => part.length > 0).join("\n\n");
  const { error: saveError } = await supabase
    .from("properties")
    .update({ house_rules: houseRules })
    .eq("company_id", companyId)
    .eq("id", property.id);
  if (saveError) throw new Error(saveError.message);
  const { error: statusError } = await supabase
    .from("house_guide_drafts")
    .update({ status: "published", title: nextTitle, body: nextBody })
    .eq("company_id", companyId)
    .eq("id", draft.id);
  if (statusError) throw new Error(statusError.message);
  return property.slug;
}

export async function discardHouseGuideDraft(
  companyId: string,
  draftId: string,
) {
  const { error } = await createServiceClient()
    .from("house_guide_drafts")
    .update({ status: "discarded" })
    .eq("company_id", companyId)
    .eq("id", draftId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}
