import { NextResponse } from "next/server";

import { cacheListingPrices } from "@/lib/pricelabs";
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
    .not("pricelabs_listing_id", "is", null);
  let cached = 0;
  for (const property of properties ?? []) {
    try {
      cached += await cacheListingPrices(property.company_id, property);
    } catch (error) {
      console.error("rate cache", property.id, error);
    }
  }
  return NextResponse.json({ cached });
}
