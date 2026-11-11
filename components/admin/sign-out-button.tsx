"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { signOutAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2"
      disabled={pending}
      onClick={() => startTransition(() => signOutAction())}
    >
      <LogOut className="size-4" aria-hidden />
      Sign out
    </Button>
  );
}
