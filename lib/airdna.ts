import { getIntegration } from "@/lib/integrations";
import { createServiceClient } from "@/lib/supabase/service";
import type { PropertyRow } from "@/types/database";
import type { Json } from "@/types/database";

export type AirDnaMetrics = {
  marketName?: string;
  occupancy?: number;
  adr?: number;
  revpar?: number;
  marketOccupancyP25?: number;
  marketOccupancyP50?: number;
  marketOccupancyP75?: number;
  marketAdrP25?: number;
  marketAdrP50?: number;
  marketAdrP75?: number;
  marketRevparP50?: number;
  occupancyPercentile?: number;
  adrPercentile?: number;
  futureOccupancy90?: number;
  comps?: Array<{ name?: string; occupancy?: number; adr?: number }>;
};

function percentileFromBand(
  actual: number | undefined,
  p25?: number,
  p50?: number,
  p75?: number,
) {
  if (actual == null || p25 == null || p50 == null || p75 == null)
    return undefined;
  if (p25 === p75) return 0.5;
  if (actual <= p25) return Math.max(0.05, 0.25 * (actual / (p25 || 1)));
  if (actual <= p50) return 0.25 + 0.25 * ((actual - p25) / (p50 - p25 || 1));
  if (actual <= p75) return 0.5 + 0.25 * ((actual - p50) / (p75 - p50 || 1));
  return Math.min(0.95, 0.75 + 0.2 * ((actual - p75) / (p75 || 1)));
}

function pickPercentiles(payload: unknown) {
  const root = payload as {
    payload?: { percentiles?: Record<string, number>; average?: number };
    percentiles?: Record<string, number>;
    average?: number;
  };
  const band = root?.payload?.percentiles ?? root?.percentiles ?? {};
  const num = (key: string) => {
    const value = band[key] ?? band[key.replace("0.", "")];
    return typeof value === "number" ? value : undefined;
  };
  return {
    p25: num("0.25") ?? num("25"),
    p50: num("0.5") ?? num("50") ?? root?.payload?.average ?? root?.average,
    p75: num("0.75") ?? num("75"),
  };
}

export type RecommendedAction = {
  headline: string;
  detail: string;
};

async function airdnaFetch(companyId: string, path: string, body?: unknown) {
  const account = await getIntegration(companyId, "airdna");
  const token = account?.credentials.token;
  if (!token) throw new Error("AirDNA is not connected.");
  const response = await fetch(
    `https://api.airdna.co/api/enterprise/v2${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AirDNA ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

export function recommendAction(metrics: AirDnaMetrics): RecommendedAction {
  const occ = metrics.occupancy ?? 0;
  const marketOcc = metrics.marketOccupancyP50 ?? occ;
  const adr = metrics.adr ?? 0;
  const marketAdr = metrics.marketAdrP50 ?? adr;
  const occGap = occ - marketOcc;
  const adrGapPct = marketAdr ? (adr - marketAdr) / marketAdr : 0;

  if (occGap < -0.1 && adrGapPct > 0.1) {
    return {
      headline: "Priced above the market and sitting empty.",
      detail:
        "Occupancy is well below the typical same-bedroom listing while ADR is above comps. Review PriceLabs min/base on the next 60 days.",
    };
  }
  if (occGap > 0.1 && adrGapPct < -0.1) {
    return {
      headline: "Filling up cheaper than comps.",
      detail:
        "Occupancy is ahead of the market and ADR is below it. Raise the PriceLabs base — there is room without giving the house away.",
    };
  }
  if (
    metrics.futureOccupancy90 != null &&
    marketOcc &&
    metrics.futureOccupancy90 < marketOcc - 0.08
  ) {
    return {
      headline: "Next 90 days are pacing behind the market.",
      detail:
        "Loosen min-stay on shoulder nights in PriceLabs and confirm the calendar is fully open.",
    };
  }
  if (occGap < -0.08) {
    return {
      headline: "Occupancy is trailing the market.",
      detail:
        "Loosen min-stay on shoulder nights and confirm the listing is fully open. Rate is not obviously the problem.",
    };
  }
  return {
    headline: "Holding pace with the market.",
    detail:
      "Occupancy and ADR sit near the median for this bedroom count. No forced move — watch forward 90-day pacing.",
  };
}

export async function refreshAirdnaSnapshot(
  companyId: string,
  property: PropertyRow,
) {
  const metrics: AirDnaMetrics = {};
  if (property.airdna_market_id) {
    try {
      const occ = await airdnaFetch(
        companyId,
        `/market/${property.airdna_market_id}/metrics/occupancy`,
        {
          num_months: 12,
          percentiles: [0.25, 0.5, 0.75],
          filters: property.bedrooms
            ? [{ bedrooms: property.bedrooms }]
            : undefined,
        },
      );
      const adr = await airdnaFetch(
        companyId,
        `/market/${property.airdna_market_id}/metrics/adr`,
        {
          num_months: 12,
          percentiles: [0.25, 0.5, 0.75],
          currency: "usd",
        },
      );
      const revpar = await airdnaFetch(
        companyId,
        `/market/${property.airdna_market_id}/metrics/revpar`,
        {
          num_months: 12,
          percentiles: [0.25, 0.5, 0.75],
          currency: "usd",
        },
      );
      const occBand = pickPercentiles(occ);
      const adrBand = pickPercentiles(adr);
      const revparBand = pickPercentiles(revpar);
      metrics.marketOccupancyP25 = occBand.p25;
      metrics.marketOccupancyP50 = occBand.p50;
      metrics.marketOccupancyP75 = occBand.p75;
      metrics.marketAdrP25 = adrBand.p25;
      metrics.marketAdrP50 = adrBand.p50;
      metrics.marketAdrP75 = adrBand.p75;
      metrics.marketRevparP50 = revparBand.p50;
      try {
        const future = await airdnaFetch(
          companyId,
          `/market/${property.airdna_market_id}/future/pricing`,
          { number_of_months: 3 },
        );
        const futureOcc =
          future?.payload?.occupancy ??
          future?.payload?.average_occupancy ??
          future?.occupancy;
        if (typeof futureOcc === "number")
          metrics.futureOccupancy90 = futureOcc;
      } catch {
        // optional pacing endpoint
      }
    } catch {
      // Keep whatever we have; cron should not fail the whole company.
    }
  }
  if (property.airdna_listing_id) {
    try {
      const comps = await airdnaFetch(
        companyId,
        `/listing/${property.airdna_listing_id}/comps`,
        {},
      );
      const list = (comps?.payload?.comps ?? comps?.comps ?? []).slice(0, 5);
      metrics.comps = list.map((comp: Record<string, unknown>) => ({
        name: String(comp.title ?? comp.name ?? "Comp"),
        occupancy: Number(comp.occupancy ?? 0),
        adr: Number(comp.adr ?? 0),
      }));
    } catch {
      // ignore
    }
  }

  const supabase = createServiceClient();
  await supabase.from("airdna_snapshots").upsert(
    {
      company_id: companyId,
      property_id: property.id,
      period: "ltm",
      metrics: metrics as unknown as Json,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "property_id,period" },
  );
  return metrics;
}

export async function getAirdnaSnapshot(propertyId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("airdna_snapshots")
    .select("*")
    .eq("property_id", propertyId)
    .eq("period", "ltm")
    .maybeSingle();
  return data;
}

export async function propertyActuals(companyId: string, propertyId: string) {
  const supabase = createServiceClient();
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const { data } = await supabase
    .from("hospitable_reservations")
    .select("check_in, check_out, payload")
    .eq("company_id", companyId)
    .eq("property_id", propertyId)
    .gte("check_in", yearAgo.toISOString().slice(0, 10));
  const rows = data ?? [];
  let bookedNights = 0;
  let revenue = 0;
  for (const row of rows) {
    if (row.check_in && row.check_out) {
      const start = new Date(`${row.check_in}T00:00:00Z`);
      const end = new Date(`${row.check_out}T00:00:00Z`);
      bookedNights += Math.max(
        0,
        Math.round((end.getTime() - start.getTime()) / 86400000),
      );
    }
    const payload = row.payload as { financials?: { accommodation?: number } };
    if (payload?.financials?.accommodation) {
      revenue += payload.financials.accommodation;
    }
  }
  const occupancy = bookedNights / 365;
  const adr = bookedNights ? revenue / 100 / bookedNights : 0;
  return {
    occupancy,
    adr,
    revpar: occupancy * adr,
    bookedNights,
  };
}

export function withPosition(
  metrics: AirDnaMetrics,
  actuals: { occupancy: number; adr: number; revpar: number },
): AirDnaMetrics {
  return {
    ...metrics,
    occupancy: actuals.occupancy,
    adr: actuals.adr,
    revpar: actuals.revpar,
    occupancyPercentile: percentileFromBand(
      actuals.occupancy,
      metrics.marketOccupancyP25,
      metrics.marketOccupancyP50,
      metrics.marketOccupancyP75,
    ),
    adrPercentile: percentileFromBand(
      actuals.adr,
      metrics.marketAdrP25,
      metrics.marketAdrP50,
      metrics.marketAdrP75,
    ),
  };
}
