"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  syncHospitablePropertiesAction,
} from "@/app/admin/(app)/integrations/hospitable-actions";
import { Button } from "@/components/ui/button";

export function HospitablePropertySyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await syncHospitablePropertiesAction();
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(result.message ?? "Listings synced.");
          router.refresh();
        });
      }}
    >
      Sync listings from Hospitable
    </Button>
  );
}
