import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isDatabaseUrlValid } from "@/lib/db";
import { auth } from "@/lib/auth";

export function isAuthConfigured() {
  return Boolean(process.env.BETTER_AUTH_SECRET && isDatabaseUrlValid());
}

export async function getSession() {
  if (!isAuthConfigured()) return null;
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export async function requireEmployee() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export function sessionHeaders(token: string) {
  const h = new Headers();
  h.set("cookie", `better-auth.session_token=${token}`);
  return h;
}
