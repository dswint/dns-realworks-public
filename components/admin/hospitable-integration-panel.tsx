"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  syncHospitableReservationsAction,
  testHospitableConnectionAction,
} from "@/app/admin/(app)/integrations/hospitable-actions";
import { importHospitableMessagesAction } from "@/app/admin/(app)/properties/house-guide-actions";
import { Button } from "@/components/ui/button";

export function HospitableIntegrationPanel({
  webhookUrl,
  connected,
}: {
  webhookUrl: string;
  connected: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function runTest() {
    startTransition(async () => {
      const result = await testHospitableConnectionAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Connected.");
    });
  }

  function runSync() {
    startTransition(async () => {
      const result = await syncHospitableReservationsAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Synced.");
    });
  }

  function runImport() {
    startTransition(async () => {
      const result = await importHospitableMessagesAction();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Imported.");
    });
  }

  return (
    <div className="bg-secondary/40 space-y-3 rounded-lg p-3">
      <div>
        <p className="text-muted-foreground text-xs">Reservation webhook URL</p>
        <code className="mt-1 block text-xs break-all">{webhookUrl}</code>
        <p className="text-muted-foreground mt-2 text-xs">
          In Hospitable: Apps → Webhooks. Send Reservations and Messages to this
          URL. Optional: set the same secret below for Signature verification
          (or Bearer). Messages are stored for the house guide. A model runs
          only when you click Draft from new messages on a property.
        </p>
      </div>
      <p className="text-muted-foreground text-xs">
        Saving the token or testing the connection imports any new Hospitable
        listings as draft site properties (edit or delete them under
        Properties).
      </p>
      <div>
        <p className="text-xs font-medium">Guest replies</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Common stay questions are answered in Hospitable Inbox AI. This app
          does not draft or send guest messages. For each property, fill the
          Knowledge Hub, then use Suggest with AI. Turn on AI Auto Reply only
          after those drafts look right, and only on the Mogul plan. Keep
          check-in, checkout, and review requests as messaging rules. The house
          guide on this site is separate: import messages here, then draft on
          the property page.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!connected || pending}
          onClick={runTest}
        >
          Test connection
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!connected || pending}
          onClick={runSync}
        >
          Import reservations
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!connected || pending}
          onClick={runImport}
        >
          Import recent messages
        </Button>
      </div>
    </div>
  );
}
