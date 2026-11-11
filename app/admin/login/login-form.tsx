"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  registerFirstOwner,
  signInEmployee,
  type AuthFormState,
} from "@/app/admin/login/actions";
import { PasswordFields } from "@/components/admin/password-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const empty: AuthFormState = { error: null };

export type LoginMode =
  "unconfigured" | "tables-missing" | "register" | "signin";

export function RedirectTo({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return <p className="text-muted-foreground p-8 text-sm">Opening admin…</p>;
}

export function LoginForm({
  mode,
  detail,
}: {
  mode: LoginMode;
  detail?: string;
}) {
  const canRegister = mode === "register";
  const action = canRegister ? registerFirstOwner : signInEmployee;
  const [state, formAction, pending] = useActionState(action, empty);
  const setup = mode === "register" || mode === "signin" ? null : mode;

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center text-sm tracking-[0.18em] uppercase">
          Admin
        </p>
        <div className="bg-card rounded-2xl border p-6 sm:p-8">
          {setup ? (
            <div className="space-y-3 text-sm">
              <h1 className="font-heading text-xl">
                {setup === "unconfigured"
                  ? "Auth is not configured"
                  : "Cannot reach auth tables"}
              </h1>
              <p className="text-muted-foreground">
                {setup === "unconfigured"
                  ? "Add BETTER_AUTH_SECRET and DATABASE_URL, then restart."
                  : (detail ??
                    "Run the foundation SQL on the same database as DATABASE_URL.")}
              </p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              <h1 className="font-heading text-center text-xl">
                {canRegister ? "Create the owner account" : "Sign in"}
              </h1>
              {canRegister ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              {canRegister ? (
                <PasswordFields />
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
              )}
              {state.error ? (
                <p className="text-destructive text-sm" role="alert">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Working…"
                  : canRegister
                    ? "Create owner"
                    : "Sign in"}
              </Button>
            </form>
          )}
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          <Link href="/" className="hover:text-foreground">
            Back to site
          </Link>
        </p>
      </div>
    </main>
  );
}
