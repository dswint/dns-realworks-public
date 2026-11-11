import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { getPool, countAuthUsers, countOrganizations } from "@/lib/db";
import { PRODUCTION_ORIGIN, siteOrigin } from "@/lib/origin";
import { ac, organizationRoles } from "@/lib/permissions";

const baseURL = siteOrigin();

export const auth = betterAuth({
  appName: "DNS Realworks",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? "build-placeholder-secret",
  database: getPool(),
  trustedOrigins: [
    baseURL,
    PRODUCTION_ORIGIN,
    "https://www.dnsrealworks.com",
    "https://dns-realworks.vercel.app",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter((origin, i, all) => Boolean(origin) && all.indexOf(origin) === i),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      try {
        const n = await countAuthUsers();
        if (n > 0) {
          throw new APIError("FORBIDDEN", {
            message: "Sign up is closed. Ask an owner to create your account.",
          });
        }
      } catch (error) {
        if (error instanceof APIError) throw error;
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: "Auth database is not configured.",
        });
      }
    }),
  },
  plugins: [
    organization({
      ac,
      roles: organizationRoles,
      creatorRole: "owner",
      allowUserToCreateOrganization: async () => {
        try {
          return (await countOrganizations()) === 0;
        } catch {
          return true;
        }
      },
    }),
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});
