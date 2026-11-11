# Agent guide

Read this before changing DNS Realworks. The product is one Next.js app
for many vacation-rental operators. DNS Realworks is tenant zero, not a
special codepath.

## Read next

- [docs/multi-tenancy.md](docs/multi-tenancy.md) — why every row is `company_id`, and how a request learns which company it is.
- [docs/automation.md](docs/automation.md) — what is automated here, what stays in Hospitable, and why the model runs only on a staff click.
- [.cursor/rules/](.cursor/rules/) — constraints that should hold on every change: tenancy, direct booking, the calendar widget, and hosted-project hygiene.

## Decisions that are easy to undo by accident

- Do not add a second app, database, or deploy per operator. Add a `companies` row.
- Do not send guest replies from this app. Hospitable Inbox AI owns the inbox.
- Do not call a model from a webhook. Message ingest stores text. House-guide drafts run when staff click Draft.
- Do not let a magic link or a checkout grant `trusted`. Trust is an operator action.
- Do not dual-write prices. PriceLabs is the rate source. Hospitable is the calendar and PMS. AirDNA is market intel.
- Do not read or write another company's rows from a request, cron, or webhook. Pass an explicit `companyId`.

## Where behavior lives

| Concern | Start here |
| --- | --- |
| Public tenant from `Host` | `lib/tenant.ts` `resolveTenant` |
| Staff tenant from the session | `lib/company.ts` `getActiveCompany` / `requirePermission` |
| Guest trust and direct checkout | `lib/guests.ts`, `.cursor/rules/direct-booking.mdc` |
| Availability and the one calendar widget | `lib/availability.ts`, `components/marketing/property-booking-calendar.tsx` |
| Hospitable ingest and reservation write gate | `lib/hospitable.ts`, `lib/hospitable-write.ts` |
| Stored guest messages | `lib/guest-messages.ts` |
| House-guide drafts | `lib/house-guide.ts` |
| Schema | `supabase/migrations/` |

Credentials are environment variables or `integration_accounts`. They are not in this repository.
