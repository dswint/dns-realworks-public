"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  discardHouseGuideDraftAction,
  draftHouseGuideAction,
  publishHouseGuideDraftAction,
} from "@/app/admin/(app)/properties/house-guide-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type HouseGuideDraft = {
  id: string;
  title: string;
  body: string;
  reason: string | null;
};

export function HouseGuideDrafts({
  propertyId,
  drafts,
  unchecked,
}: {
  propertyId: string;
  drafts: HouseGuideDraft[];
  unchecked: number;
}) {
  const [pending, startTransition] = useTransition();

  function run(
    task: () => Promise<{ error: string | null; message?: string | null }>,
  ) {
    startTransition(async () => {
      const result = await task();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved.");
    });
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl">House guide drafts</h2>
        <p className="text-muted-foreground text-sm">
          Guest replies stay in Hospitable. This reads saved messages only when
          you ask, then waits for you to publish. {unchecked} new{" "}
          {unchecked === 1 ? "message" : "messages"} waiting.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || unchecked === 0}
        onClick={() => run(() => draftHouseGuideAction(propertyId))}
      >
        Draft from new messages
      </Button>
      {drafts.length ? (
        <ul className="space-y-4">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="bg-card ring-foreground/10 space-y-3 rounded-xl p-4 ring-1"
            >
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  run(() =>
                    publishHouseGuideDraftAction(
                      propertyId,
                      draft.id,
                      String(data.get("title") ?? ""),
                      String(data.get("body") ?? ""),
                    ),
                  );
                }}
              >
                <Input name="title" defaultValue={draft.title} required />
                <Textarea name="body" defaultValue={draft.body} required />
                {draft.reason ? (
                  <p className="text-muted-foreground text-xs">
                    {draft.reason}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" size="sm" disabled={pending}>
                    Publish to house guide
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        discardHouseGuideDraftAction(propertyId, draft.id),
                      )
                    }
                  >
                    Discard
                  </Button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
