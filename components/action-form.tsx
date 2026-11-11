"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { useFormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { type FormState } from "@/lib/form-state";

const empty: FormState = { error: null };

export function ActionForm({
  action,
  success = "Saved.",
  className,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  success?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, empty);
  useFormFeedback(state, success);

  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
