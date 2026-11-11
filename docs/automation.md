# Automation

The operating goal is less manual work per stay without giving an
automated system the ability to talk to a guest, charge them, or change
a live calendar by mistake.

Three systems already had a job. This app does not redo those jobs.

| System | Job | What this app does |
| --- | --- | --- |
| Hospitable | PMS, calendar, guest inbox | Reads availability and messages. Writes a reservation only after a trusted guest pays, and only when the write gate is on. |
| PriceLabs | Nightly rates | Stores the rates it publishes. Does not invent a second price. |
| AirDNA | Market comps | Read-only intel for staff. |

Guest replies stay in Hospitable. Inbox AI, the Knowledge Hub, and
Suggest with AI already sit on the thread the guest is in. Auto Reply,
when an operator turns it on, is a Hospitable setting. This codebase has
no path that posts a guest message. Building a second inbox agent would
duplicate that product and would spend model tokens on every inbound
webhook.

## What is automated here

**Ingest.** `message.created` on `/api/webhooks/hospitable/[companyId]`
stores the message (`lib/guest-messages.ts`) and returns. A payload this
app cannot parse is not acknowledged as success, so the provider can
retry. Staff can also import recent reservation threads. A rate limit
from Hospitable is reported as a failure. It is not counted as a saved
import.

**Staff memory.** Messages link to `guests.id` for the company. The guest
admin opens that history in a modal, grouped by reservation. That
history is not published on the public house guide. A guest's complaints,
refunds, and one-off preferences are not instructions for the next guest.

**House guide drafts.** The public house guide is the stay page
(`/stay` in the URL, labeled "House guide"): house rules and facts the
next guest should read. Staff click Draft on a property.
`draftHouseGuide` sends at most 12 unchecked messages, clipped, plus a
clip of the current guide. The model may return at most two updates.
Nothing is written onto the guide until staff publish. Publish appends
the title and body once. Discard drops the draft.

Messages are marked checked only after the draft insert succeeds. If the
insert fails, the same messages can be drafted again. A heading is
treated as already covered only when that title is its own line in the
guide, so a short word such as "wifi" inside a sentence does not suppress
a new section.

**Checkout side effects.** A trusted guest can pay on-site. Stripe
confirms payment. Hospitable `POST /reservations` then blocks the
calendar. There is no Hospitable sandbox, so `hospitableReservationWriteEnabled()`
is on by default only when `VERCEL_ENV=production`. Preview and local
stay read-only unless `HOSPITABLE_RESERVATION_WRITE=true`.

**Scheduled reads.** Vercel crons refresh PriceLabs rates and AirDNA
stats. They do not message guests.

## What is deliberately not automated

**Trust.** Direct booking is for guests the operator already knows.
`canUseDirectBook` requires `trust_status === 'trusted'` and no incident
flag. Hospitable import creates `captured` or `invited` guests. A magic
link proves the email. It does not promote anyone to trusted. First
stays stay on Airbnb or with staff. The calendar still explains that
on-site booking is for returning guests. See
`.cursor/rules/direct-booking.mdc`.

**Model calls on ingest.** Webhooks can arrive all day. The house-guide
model runs only from the Draft action, with a small prompt and a small
output. That is the token budget: store everything, reason over a slice,
and only when a person asks.

**Refunds, pricing, payments, date changes, and lock codes.** Those are
excluded from house-guide drafts. Hospitable's own Auto Reply also
refuses them. Durable facts (how the house works, checkout, parking,
access, a local tip that is true for every guest) are the only drafts
worth publishing.

## Failure order

The unsafe failures were silent success and double writes.

- An import that saves nothing because Hospitable returned 429 must
  surface the error and stop, not toast a success.
- Draft rows are inserted before `guide_checked_at` is set.
- Publishing a draft that is already present in `house_rules` does not
  append it again.
- Guest message counts and the history modal page past the default
  PostgREST row cap so a long stay history is not truncated.

When adding automation, keep the same split: ingest and idempotent sync
can run unattended; anything that speaks for the operator, spends model
tokens, or writes to Hospitable waits for an explicit staff action or
the production write gate.
