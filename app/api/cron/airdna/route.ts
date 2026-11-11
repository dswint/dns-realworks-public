import { NextResponse } from "next/server";

import { refreshAirdnaSnapshot } from "@/lib/airdna";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .or("airdna_listing_id.not.is.null,airdna_market_id.not.is.null");
  let refreshed = 0;
  for (const property of properties ?? []) {
    try {
      await refreshAirdnaSnapshot(property.company_id, property);
      refreshed += 1;
    } catch (error) {
      console.error("airdna snapshot", property.id, error);
    }
  }
  return NextResponse.json({ refreshed });
}
