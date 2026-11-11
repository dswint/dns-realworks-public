import { NextResponse } from "next/server";

import { maybeTrustAfterStay } from "@/lib/guests";
import { ingestHospitableMessage } from "@/lib/guest-messages";
import {
  ingestHospitableReservation,
  verifyHospitableWebhook,
  type HospitableReservationPayload,
} from "@/lib/hospitable";
import { getIntegration } from "@/lib/integrations";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const { companyId } = await params;
  const supabase = createServiceClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) {
    return NextResponse.json({ error: "Unknown company" }, { status: 404 });
  }

  const rawBody = await request.text();
  const account = await getIntegration(companyId, "hospitable");
  const webhookSecret = account?.credentials.webhook_secret;
  if (webhookSecret) {
    const ok = verifyHospitableWebhook(rawBody, webhookSecret, request.headers);
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: {
    action?: string;
    data?: unknown;
  };
  try {
    body = JSON.parse(rawBody) as {
      action?: string;
      data?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action ?? "";
  if (action === "message.created") {
    const result = await ingestHospitableMessage(companyId, body.data ?? body);
    if (!result.stored) {
      return NextResponse.json(
        { error: "Unrecognized message" },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true });
  }
  if (
    action &&
    !action.startsWith("reservation.") &&
    action !== "reservation"
  ) {
    return NextResponse.json({ ok: true, skipped: action });
  }

  const payload = (body.data ?? body) as HospitableReservationPayload;
  await ingestHospitableReservation(companyId, payload);
  const hospitableId = payload.id ?? payload.uuid;
  if (hospitableId) {
    const { data: row } = await supabase
      .from("hospitable_reservations")
      .select("guest_id")
      .eq("company_id", companyId)
      .eq("hospitable_id", hospitableId)
      .maybeSingle();
    if (row?.guest_id) {
      await maybeTrustAfterStay(companyId, row.guest_id);
    }
  }
  return NextResponse.json({ ok: true });
}
