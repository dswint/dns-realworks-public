"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { bootstrapOwner } from "@/lib/bootstrap-owner";
import { countAuthUsers } from "@/lib/db";
import { validatePassword } from "@/lib/password";
import { isAuthConfigured } from "@/lib/session";

export type AuthFormState = { error: string | null };

export async function registerFirstOwner(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isAuthConfigured()) {
    return { error: "Set BETTER_AUTH_SECRET and DATABASE_URL." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  if (!name) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  const passwordError = validatePassword(password, confirm);
  if (passwordError) return { error: passwordError };

  try {
    if ((await countAuthUsers()) > 0) {
      return { error: "An owner already exists. Sign in instead." };
    }
  } catch {
    return { error: "Auth tables are missing. Run the foundation SQL." };
  }

  const result = await auth.api.signUpEmail({
    body: { name, email, password },
    headers: await headers(),
  });
  if (!result?.user) return { error: "Could not create the owner account." };
  try {
    await bootstrapOwner(result.user.id, result.token ?? null);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Account created but company linking failed.",
    };
  }
  redirect("/admin?notice=welcome");
}

export async function signInEmployee(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isAuthConfigured()) {
    return { error: "Set BETTER_AUTH_SECRET and DATABASE_URL." };
  }
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
    if (!result) return { error: "Invalid email or password." };
  } catch {
    return { error: "Invalid email or password." };
  }
  redirect("/admin?notice=welcome");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
