-- Property QR self-registration. Guests are still company-scoped.
-- Scanning a code records which house they were staying in.
-- It does not grant trust_status = trusted.

create table guest_registrations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint guest_registrations_guest_property_unique unique (guest_id, property_id)
);

create index guest_registrations_company_idx
  on guest_registrations (company_id, created_at desc);

alter table guest_registrations enable row level security;

revoke all on table guest_registrations from anon, authenticated;
