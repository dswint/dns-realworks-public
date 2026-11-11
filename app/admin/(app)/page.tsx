import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveCompany } from "@/lib/company";
import { createServiceClient } from "@/lib/supabase/service";

async function countRows(
  table: "properties" | "pages" | "guests" | "bookings",
  companyId: string,
) {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);
  return count ?? 0;
}

export default async function AdminHome() {
  const company = await getActiveCompany();
  if (!company) return null;
  const [properties, pages, guests, bookings] = await Promise.all([
    countRows("properties", company.id),
    countRows("pages", company.id),
    countRows("guests", company.id),
    countRows("bookings", company.id),
  ]);
  const stats = [
    { label: "Properties", value: properties, href: "/admin/properties" },
    { label: "Pages", value: pages, href: "/admin/pages" },
    { label: "Guests", value: guests, href: "/admin/guests" },
    { label: "Direct bookings", value: bookings, href: "/admin/bookings" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-3xl">Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {company.name} · tenant operations
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground text-sm">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
