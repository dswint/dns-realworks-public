"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { type FormState } from "@/lib/form-state";

export function ConfirmActionButton({
  action,
  message,
  success = "Deleted.",
  label = "Delete",
  href,
  variant = "ghost",
  size = "sm",
  className,
}: {
  action: () => Promise<FormState>;
  message: string;
  success?: string;
  label?: React.ReactNode;
  href?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(message)) return;
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      if (href) router.push(href);
      else router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? "Working…" : label}
    </Button>
  );
}
