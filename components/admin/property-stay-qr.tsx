import QRCode from "qrcode";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { propertyStayRegisterUrl } from "@/lib/origin";
import { createServiceClient } from "@/lib/supabase/service";

export async function PropertyStayQr({
  companyId,
  slug,
  published,
}: {
  companyId: string;
  slug: string;
  published: boolean;
}) {
  const { data: company } = await createServiceClient()
    .from("companies")
    .select("custom_domain")
    .eq("id", companyId)
    .maybeSingle();
  const url = propertyStayRegisterUrl(company?.custom_domain ?? null, slug);
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 220,
    color: { dark: "#1c1914", light: "#fffdf8" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>In-house guest QR</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="bg-card w-fit rounded-xl p-3"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="space-y-2 text-sm">
          <p>
            Print this and leave it in the house. A guest scans it, then enters
            their name, email, and phone.
          </p>
          <p>
            A new email is saved. An email we already have asks them to confirm
            the matching contact. Scanning does not mark anyone trusted.
          </p>
          {!published ? (
            <p className="text-destructive">
              This property is still a draft, so the QR page will not open until
              you publish it.
            </p>
          ) : null}
          <p className="break-all">
            <a className="underline" href={url}>
              {url}
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
