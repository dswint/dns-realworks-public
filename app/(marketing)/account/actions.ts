"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  GUEST_COOKIE,
  requestMagicLink,
  safeGuestNext,
} from "@/lib/guests";
import { resolveTenant } from "@/lib/tenant";

export async function requestMagicLinkAction(formData: FormData) {
  const tenant = await resolveTenant();
  if (!tenant) redirect("/account");
  const email = String(formData.get("email") ?? "");
  const next = safeGuestNext(String(formData.get("next") ?? "") || null);
  await requestMagicLink(tenant.id, email, next);
  const notice = "/account?notice=sent";
  redirect(next ? `${notice}&next=${encodeURIComponent(next)}` : notice);
}

export async function signOutGuestAction() {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
  redirect("/account");
}
