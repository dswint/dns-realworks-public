import { readFileSync } from "fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  const key = line.slice(0, i);
  const value = line.slice(i + 1).replace(/^"|"$/g, "");
  if (!process.env[key]) process.env[key] = value;
}

async function main() {
  const { createServiceClient } = await import("../lib/supabase/service");
  const { syncHospitableReservations } = await import("../lib/hospitable");

  const supabase = createServiceClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", "dns-realworks")
    .single();
  if (error || !company) throw new Error(error?.message ?? "No company");

  const imported = await syncHospitableReservations(company.id);
  console.log(`Imported ${imported} reservations.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
