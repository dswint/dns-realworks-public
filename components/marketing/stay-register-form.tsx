"use client";

import { useActionState } from "react";

import {
  confirmStayGuestAction,
  registerStayGuestAction,
  type StayRegisterState,
} from "@/app/(marketing)/stay/[slug]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const empty: StayRegisterState = {
  error: null,
  step: "form",
  trusted: false,
  draft: null,
  match: null,
};

export function StayRegisterForm({
  propertySlug,
  propertyName,
}: {
  propertySlug: string;
  propertyName: string;
}) {
  const [state, action, pending] = useActionState(
    registerStayGuestAction,
    empty,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmStayGuestAction,
    state,
  );
  const view = confirmState.step === "form" ? state : confirmState;

  if (view.step === "success") {
    return (
      <div className="bg-card ring-foreground/10 space-y-3 rounded-2xl p-6 ring-1">
        <h2 className="text-2xl">You&apos;re registered.</h2>
        <p className="text-muted-foreground text-sm">
          {view.trusted
            ? `${view.draft?.fullName ?? "You"} can sign in with ${view.draft?.email} to book directly.`
            : `We saved ${view.draft?.fullName ?? "you"} for ${propertyName}. Direct booking opens after we confirm this stay.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view.step === "confirm" && view.match ? (
        <form
          action={confirmAction}
          className="bg-card ring-foreground/10 space-y-4 rounded-2xl p-6 ring-1"
        >
          <input type="hidden" name="property" value={propertySlug} />
          <input type="hidden" name="guestId" value={view.match.id} />
          <input
            type="hidden"
            name="fullName"
            value={view.draft?.fullName ?? ""}
          />
          <input type="hidden" name="email" value={view.draft?.email ?? ""} />
          <input type="hidden" name="phone" value={view.draft?.phone ?? ""} />
          <h2 className="text-2xl">We already have this email.</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{view.match.fullName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{view.match.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{view.match.phone || "—"}</dd>
            </div>
          </dl>
          <p className="text-sm">Is this you?</p>
          {view.error ? (
            <p className="text-destructive text-sm">{view.error}</p>
          ) : null}
          <Button type="submit" disabled={confirmPending}>
            {confirmPending ? "Saving…" : "Yes, that's me"}
          </Button>
        </form>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="property" value={propertySlug} />
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            required
            defaultValue={view.draft?.fullName ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={view.draft?.email ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={view.draft?.phone ?? ""}
          />
        </div>
        {view.step === "form" && view.error ? (
          <p className="text-destructive text-sm">{view.error}</p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Submit"}
        </Button>
      </form>
    </div>
  );
}
