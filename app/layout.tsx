import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { FlashToast } from "@/components/form-feedback";
import { ThemeStyle } from "@/components/theme-style";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_THEME } from "@/lib/theme";
import { resolveTenant } from "@/lib/tenant";
import { PRODUCTION_ORIGIN } from "@/lib/origin";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--ff-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--ff-figtree",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await resolveTenant();
  return {
    metadataBase: new URL(
      process.env.VERCEL_ENV === "production"
        ? PRODUCTION_ORIGIN
        : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: {
      default: tenant?.wordmark ?? "Stay",
      template: `%s · ${tenant?.wordmark ?? "Stay"}`,
    },
    description: tenant?.tagline ?? undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await resolveTenant();
  const theme = tenant?.theme ?? DEFAULT_THEME;
  return (
    <html
      lang="en"
      data-photo={theme.photography.treatment}
      className={`${fraunces.variable} ${figtree.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeStyle theme={theme} />
        {children}
        <Toaster />
        <FlashToast />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
