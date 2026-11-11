import { NextResponse, type NextRequest } from "next/server";

import { consumeMagicLink, GUEST_COOKIE, safeGuestNext } from "@/lib/guests";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const next = safeGuestNext(request.nextUrl.searchParams.get("next"));
  const fallback = new URL("/account", request.url);
  if (!token) return NextResponse.redirect(fallback);

  const result = await consumeMagicLink(token);
  if (!result) return NextResponse.redirect(fallback);

  const response = NextResponse.redirect(
    new URL(next ?? "/account", request.url),
  );
  response.cookies.set(GUEST_COOKIE, result.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
