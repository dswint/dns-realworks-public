# Multi-tenancy

DNS Realworks is one deployed app and one database. A new operator is a
`companies` row, a host, and a theme. It is not a fork, a new Vercel
project, or a new set of routes.

That choice is the product. The same booking, calendar, guest, and
integration code has to be safe when a second operator's guests and
listings sit beside the first. Tenant zero (the DNS Realworks brand in
`supabase/seed.sql`) is only the first row.

## Who the tenant is

`companies.id` is the only tenant key. Application columns call it
`company_id`. Two different lookups produce that id, because the public
site and the staff app do not share a session.

**Public site.** `resolveTenant()` in `lib/tenant.ts` reads the `Host`
header. It matches `companies.custom_domain`, then a slug subdomain, then
`DEV_FALLBACK_COMPANY_SLUG` for local development. Branding (wordmark,
tagline, CSS variables) comes from that row's `theme`. Shared components
do not hardcode an operator name or color.

**Staff app.** Better Auth identifies the person. The active organization
id maps to `companies.auth_org_id` in `getActiveCompany()`.
`requirePermission()` runs before a staff mutation. The client does not
get to name the company.

A webhook is a third door. Hospitable and other providers call
`/api/webhooks/<provider>/[companyId]`. The handler checks that the
company exists, then loads that company's integration row. The id in the
URL is the tenant. A payload is never applied to "whatever company is
handy."

## Why the database is shaped this way

Every tenant-owned table carries `company_id`, and every read or write
filters on it: properties, pages, guests, bookings, reservations,
messages, drafts, integration accounts. Guests are not a global CRM. The
same email at two operators is two `guests` rows. Message history, trust,
and incidents stay inside the company that hosted the stay.

Row Level Security is on. The server uses the service role only after the
tenant and the permission are already known. Anon and authenticated roles
are not a back door into another operator's tables.

External systems keep their own ids. Those ids are stored on the domain
row (`properties.hospitable_property_id`, `pricelabs_listing_id`,
`hospitable_reservations.hospitable_id`) and upserts conflict on
`(company_id, external id)`. Reconnecting an integration replaces the
token. It does not insert a second property when the external id already
matches.

Secrets follow the same boundary. A Hospitable personal access token, a
PriceLabs key, or a webhook secret lives in `integration_accounts` for
that `company_id` and provider. A single env var for "the Hospitable
token" would bind every future operator to tenant zero.

## What a new feature has to answer

Which `company_id`? Can this response include another tenant's rows?
Imports, crons, and drafts take an explicit company id and, when they
walk more than one company, isolate each iteration. Operator-specific
rules (fees, copy, trust policy, credentials) belong on the company, the
property, or the integration row, not in a global environment variable.

Property sites are pages under the tenant (`properties` plus
`pages.property_id`). They are not separate apps. The calendar on a
property page is the one `PropertyBookingCalendar` widget. The collection
page searches dates across that tenant's published homes. See
`.cursor/rules/booking-calendar.mdc` and `.cursor/rules/multi-tenancy.mdc`.
