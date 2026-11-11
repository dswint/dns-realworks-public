import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateSearch({
  action = "/properties",
  propertySlug,
  defaultCheckIn,
  defaultCheckOut,
  defaultGuests = 2,
  submitLabel,
}: {
  action?: string;
  propertySlug?: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: number;
  submitLabel?: string;
}) {
  const label =
    submitLabel ?? (propertySlug ? "Check dates" : "Find available stays");
  return (
    <form
      action={action}
      className="border-border bg-card grid gap-3 rounded-2xl border p-4 shadow-sm md:grid-cols-4 md:items-end"
    >
      {propertySlug ? (
        <input type="hidden" name="property" value={propertySlug} />
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checkIn">Arrive</Label>
        <Input
          id="checkIn"
          name="checkIn"
          type="date"
          required
          defaultValue={defaultCheckIn}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checkOut">Depart</Label>
        <Input
          id="checkOut"
          name="checkOut"
          type="date"
          required
          defaultValue={defaultCheckOut}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="guests">Guests</Label>
        <Input
          id="guests"
          name="guests"
          type="number"
          min={1}
          defaultValue={defaultGuests}
        />
      </div>
      <Button type="submit" size="lg">
        {label}
      </Button>
    </form>
  );
}
