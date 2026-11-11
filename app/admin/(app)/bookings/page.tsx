import { getActiveCompany } from "@/lib/company";
import { formatMoney } from "@/lib/money";
import { createServiceClient } from "@/lib/supabase/service";

export default async function BookingsAdmin() {
  const company = await getActiveCompany();
  if (!company) return null;
  const supabase = createServiceClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, check_in, check_out, total_cents, currency, hospitable_reservation_id",
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl">Direct bookings</h1>
      <ul className="divide-border divide-y text-sm">
        {(bookings ?? []).map((booking) => (
          <li key={booking.id} className="py-3">
            {booking.check_in} → {booking.check_out} · {booking.status} ·{" "}
            {formatMoney(booking.total_cents, booking.currency)}
            {booking.hospitable_reservation_id
              ? ` · Hospitable ${booking.hospitable_reservation_id}`
              : " · write-back pending"}
          </li>
        ))}
      </ul>
    </div>
  );
}
