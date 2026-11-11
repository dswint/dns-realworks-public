import Link from "next/link";

import {
  revokeGuestAction,
  updateGuestAction,
  updateGuestContactAction,
} from "@/app/admin/(app)/guests/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { GuestMessageHistory } from "@/components/admin/guest-message-history";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { getActiveCompany } from "@/lib/company";
import { countMessagesByGuest } from "@/lib/guest-messages";
import { listGuestsPage, type GuestListQuery } from "@/lib/guests";
import { cn } from "@/lib/utils";

const fieldClass =
  "border-input h-9 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function guestHref(query: GuestListQuery, page?: number) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.trust) params.set("trust", query.trust);
  if (query.source) params.set("source", query.source);
  if (query.contact) params.set("contact", query.contact);
  if (query.sort && query.sort !== "name") params.set("sort", query.sort);
  if (query.dir === "desc") params.set("dir", "desc");
  if (page && page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/guests?${search}` : "/admin/guests";
}

export default async function GuestsAdmin({
  searchParams,
}: {
  searchParams: Promise<GuestListQuery>;
}) {
  const company = await getActiveCompany();
  if (!company) return null;
  const query = await searchParams;
  const { guests, total, page, pageSize, pageCount } = await listGuestsPage(
    company.id,
    query,
  );
  const messageCounts = await countMessagesByGuest(
    company.id,
    guests.map((guest) => guest.id),
  );
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const filtered = Boolean(
    query.q?.trim() || query.trust || query.source || query.contact,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl">Guests</h1>
      <p className="text-muted-foreground text-sm">
        Airbnb does not give Hospitable a real guest email. Vrbo and direct
        bookings usually do. Add email and phone here for magic-link sign-in and
        ops. Trust is company-scoped — only after a stay you are willing to host
        again.
      </p>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Label htmlFor="guest-q">Search</Label>
          <Input
            id="guest-q"
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Name, email, or phone"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="guest-trust">Trust</Label>
          <select
            id="guest-trust"
            name="trust"
            defaultValue={query.trust ?? ""}
            className={cn(fieldClass, "mt-1.5")}
          >
            <option value="">Any</option>
            <option value="stub">Stub</option>
            <option value="captured">Captured</option>
            <option value="invited">Invited</option>
            <option value="trusted">Trusted</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
        <div>
          <Label htmlFor="guest-source">Source</Label>
          <select
            id="guest-source"
            name="source"
            defaultValue={query.source ?? ""}
            className={cn(fieldClass, "mt-1.5")}
          >
            <option value="">Any</option>
            <option value="airbnb">Airbnb</option>
            <option value="hospitable">Hospitable</option>
            <option value="direct">Direct</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <Label htmlFor="guest-contact">Contact</Label>
          <select
            id="guest-contact"
            name="contact"
            defaultValue={query.contact ?? ""}
            className={cn(fieldClass, "mt-1.5")}
          >
            <option value="">Any</option>
            <option value="missing_email">Missing email</option>
            <option value="has_email">Has email</option>
            <option value="missing_phone">Missing phone</option>
            <option value="has_phone">Has phone</option>
          </select>
        </div>
        <div>
          <Label htmlFor="guest-sort">Sort</Label>
          <select
            id="guest-sort"
            name="sort"
            defaultValue={query.sort ?? "name"}
            className={cn(fieldClass, "mt-1.5")}
          >
            <option value="name">Name</option>
            <option value="updated">Last updated</option>
            <option value="created">Created</option>
            <option value="trust">Trust</option>
            <option value="source">Source</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div>
          <Label htmlFor="guest-dir">Order</Label>
          <select
            id="guest-dir"
            name="dir"
            defaultValue={query.dir === "desc" ? "desc" : "asc"}
            className={cn(fieldClass, "mt-1.5")}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
        <button type="submit" className={buttonVariants({ size: "default" })}>
          Apply
        </button>
        {filtered ? (
          <Link
            href="/admin/guests"
            className={buttonVariants({ variant: "outline" })}
          >
            Clear
          </Link>
        ) : null}
      </form>

      <p className="text-muted-foreground text-sm">
        {total === 0
          ? "No guests match."
          : `Showing ${start}–${end} of ${total}`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2">Name</th>
              <th>Contact</th>
              <th>Trust</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => {
              const name =
                [guest.first_name, guest.last_name].filter(Boolean).join(" ") ||
                guest.email ||
                "this guest";
              return (
                <tr key={guest.id} className="border-border border-t">
                  <td className="py-2 align-top">
                    <div>
                      {[guest.first_name, guest.last_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {guest.source}
                      {guest.opted_in ? " · opt-in" : ""}
                    </p>
                  </td>
                  <td className="py-2 align-top">
                    <ActionForm
                      action={updateGuestContactAction}
                      success="Contact saved."
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input type="hidden" name="id" value={guest.id} />
                      <Input
                        type="email"
                        name="email"
                        defaultValue={guest.email ?? ""}
                        placeholder="Email"
                        aria-label={`Email for ${name}`}
                        className="sm:w-56"
                      />
                      <Input
                        type="tel"
                        name="phone"
                        defaultValue={guest.phone ?? ""}
                        placeholder="Phone"
                        aria-label={`Phone for ${name}`}
                        className="sm:w-40"
                      />
                      <SubmitButton
                        size="sm"
                        variant="outline"
                        pendingLabel="Saving…"
                      >
                        Save
                      </SubmitButton>
                    </ActionForm>
                  </td>
                  <td className="py-2 align-top">{guest.trust_status}</td>
                  <td className="py-2 align-top">
                    <div className="flex justify-end gap-1">
                      <GuestMessageHistory
                        guestId={guest.id}
                        guestName={name}
                        count={messageCounts.get(guest.id) ?? 0}
                      />
                      <ActionForm
                        action={updateGuestAction}
                        success="Guest trusted."
                      >
                        <input type="hidden" name="id" value={guest.id} />
                        <input
                          type="hidden"
                          name="trust_status"
                          value="trusted"
                        />
                        <SubmitButton
                          size="sm"
                          variant="outline"
                          pendingLabel="Saving…"
                        >
                          Trust
                        </SubmitButton>
                      </ActionForm>
                      <ConfirmActionButton
                        action={revokeGuestAction.bind(null, guest.id)}
                        message={`Revoke trust for ${name}? They will lose direct booking.`}
                        success="Trust revoked."
                        label="Revoke"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <nav className="flex flex-wrap items-center gap-2" aria-label="Pages">
          {page > 1 ? (
            <Link
              href={guestHref(query, page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Previous
            </Link>
          ) : null}
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (number) => (
              <Link
                key={number}
                href={guestHref(query, number)}
                aria-current={number === page ? "page" : undefined}
                className={buttonVariants({
                  variant: number === page ? "default" : "outline",
                  size: "sm",
                })}
              >
                {number}
              </Link>
            ),
          )}
          {page < pageCount ? (
            <Link
              href={guestHref(query, page + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
