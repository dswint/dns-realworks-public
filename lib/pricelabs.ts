import { getIntegration } from "@/lib/integrations";
import { createServiceClient, hasServiceClient } from "@/lib/supabase/service";
import type { PropertyRow } from "@/types/database";

export type QuotedNight = {
  date: string;
  amountCents: number;
  minStay: number | null;
  available: boolean | null;
};

async function pricelabsFetch(companyId: string, path: string, body: unknown) {
  const account = await getIntegration(companyId, "pricelabs");
  const token = account?.credentials.token;
  if (!token) throw new Error("PriceLabs is not connected.");
  const response = await fetch(`https://api.pricelabs.co${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PriceLabs ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

export async function quoteStay(
  companyId: string,
  property: PropertyRow,
  checkIn: string,
  checkOut: string,
): Promise<QuotedNight[]> {
  if (!property.pricelabs_listing_id) {
    return cachedQuote(property.id, checkIn, checkOut);
  }
  const json = await pricelabsFetch(companyId, "/v1/listing_prices", {
    listings: [
      {
        id: property.pricelabs_listing_id,
        pms: property.pricelabs_pms || "hospitable",
        dateFrom: checkIn,
        dateTo: checkOut,
      },
    ],
  });
  const listing = Array.isArray(json) ? json[0] : json?.[0];
  const data = (listing?.data ?? []) as Array<Record<string, unknown>>;
  return data.map((row) => ({
    date: String(row.date),
    amountCents: Math.round(Number(row.price ?? row.booked_price ?? 0) * 100),
    minStay: row.min_stay != null ? Number(row.min_stay) : null,
    available: row.unbookable === "1" || row.unbookable === 1 ? false : true,
  }));
}

export async function cachedQuote(
  propertyId: string,
  checkIn: string,
  checkOut: string,
): Promise<QuotedNight[]> {
  if (!hasServiceClient()) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("nightly_rates")
    .select("stay_date, amount_cents, min_stay, available")
    .eq("property_id", propertyId)
    .gte("stay_date", checkIn)
    .lt("stay_date", checkOut)
    .order("stay_date");
  return (data ?? []).map((row) => ({
    date: row.stay_date,
    amountCents: row.amount_cents,
    minStay: row.min_stay,
    available: row.available,
  }));
}

export async function cacheListingPrices(
  companyId: string,
  property: PropertyRow,
) {
  if (!property.pricelabs_listing_id) return 0;
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 365);
  const nights = await quoteStay(
    companyId,
    property,
    today.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
  );
  if (!nights.length) return 0;
  const supabase = createServiceClient();
  const rows = nights.map((night) => ({
    property_id: property.id,
    company_id: companyId,
    stay_date: night.date,
    amount_cents: night.amountCents,
    currency: property.currency,
    min_stay: night.minStay,
    available: night.available,
    source: "pricelabs",
    fetched_at: new Date().toISOString(),
  }));
  await supabase.from("nightly_rates").upsert(rows);
  return rows.length;
}

export async function sampleFromRate(propertyId: string) {
  const start = new Date();
  const end = new Date(start.getTime() + 86400000 * 14);
  const nights = await cachedQuote(
    propertyId,
    start.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
  );
  return nights.find((night) => night.amountCents > 0)?.amountCents ?? null;
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
