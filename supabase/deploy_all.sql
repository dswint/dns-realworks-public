-- Multi-tenant foundation. Every later table is company-scoped.
-- Staff identity is Better Auth (not Supabase Auth).
-- Public reads use published/active flags. Admin writes use the service role
-- after a Better Auth permission check.

create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- companies (a host brand / tenant)
-- ============================================================
create table companies (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  custom_domain      text unique,
  plan               text not null default 'flagship',
  status             text not null default 'active',
  theme              jsonb not null default '{}'::jsonb,
  stripe_account_id  text,
  auth_org_id        text unique,
  logo_path          text,
  wordmark           text,
  wordmark_sub       text,
  tagline            text,
  email              text,
  phone              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint companies_status_check check (status in ('active', 'pending', 'suspended')),
  constraint companies_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();

-- ============================================================
-- Better Auth
-- ============================================================
create table "user" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null default false,
  "image" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "role" text,
  "banned" boolean default false,
  "banReason" text,
  "banExpires" timestamptz
);

create table "session" (
  "id" text primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade,
  "impersonatedBy" text,
  "activeOrganizationId" text
);

create index session_userId_idx on "session" ("userId");

create table "account" (
  "id" text primary key,
  "issuer" text not null default '',
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("providerId", "accountId")
);

create index account_userId_idx on "account" ("userId");

create table "verification" (
  "id" text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index verification_identifier_idx on "verification" ("identifier");

create table "organization" (
  "id" text primary key,
  "name" text not null,
  "slug" text not null unique,
  "logo" text,
  "createdAt" timestamptz not null default now(),
  "metadata" text
);

create table "member" (
  "id" text primary key,
  "organizationId" text not null references "organization" ("id") on delete cascade,
  "userId" text not null references "user" ("id") on delete cascade,
  "role" text not null default 'member',
  "createdAt" timestamptz not null default now()
);

create index member_organizationId_idx on "member" ("organizationId");
create index member_userId_idx on "member" ("userId");

create table "invitation" (
  "id" text primary key,
  "organizationId" text not null references "organization" ("id") on delete cascade,
  "email" text not null,
  "role" text,
  "status" text not null default 'pending',
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "inviterId" text not null references "user" ("id") on delete cascade
);

create index invitation_organizationId_idx on "invitation" ("organizationId");
create index invitation_email_idx on "invitation" ("email");

revoke all on table
  "user", "session", "account", "verification",
  "organization", "member", "invitation"
from anon, authenticated, public;

alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;
alter table "organization" enable row level security;
alter table "member" enable row level security;
alter table "invitation" enable row level security;

grant all on table
  "user", "session", "account", "verification",
  "organization", "member", "invitation"
to postgres, service_role;

-- ============================================================
-- properties
-- ============================================================
create table properties (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references companies(id) on delete cascade,
  slug                    text not null,
  name                    text not null,
  status                  text not null default 'draft',
  headline                text,
  summary                 text,
  location_name           text,
  latitude                double precision,
  longitude               double precision,
  bedrooms                integer,
  bathrooms               numeric(4,1),
  sleeps                  integer,
  sqft                    integer,
  amenities               text[] not null default '{}',
  house_rules             text,
  airbnb_url              text,
  hospitable_property_id  text,
  pricelabs_listing_id    text,
  pricelabs_pms           text not null default 'hospitable',
  airdna_listing_id       text,
  airdna_market_id        text,
  cleaning_fee_cents      integer not null default 0,
  currency                char(3) not null default 'USD',
  accent                  jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint properties_company_slug unique (company_id, slug),
  constraint properties_status_check check (status in ('draft', 'published')),
  constraint properties_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index properties_company_idx on properties (company_id);
create trigger properties_set_updated_at
  before update on properties
  for each row execute function set_updated_at();

-- ============================================================
-- CMS pages + blocks
-- ============================================================
create table pages (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  property_id  uuid references properties(id) on delete cascade,
  slug         text not null,
  title        text not null,
  status       text not null default 'draft',
  template     text not null default 'inner',
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint pages_status_check check (status in ('draft', 'published')),
  constraint pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index pages_brand_slug_idx
  on pages (company_id, slug)
  where property_id is null;

create unique index pages_property_slug_idx
  on pages (company_id, property_id, slug)
  where property_id is not null;

create trigger pages_set_updated_at
  before update on pages
  for each row execute function set_updated_at();

create table blocks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  page_id     uuid not null references pages(id) on delete cascade,
  type        text not null,
  position    integer not null default 0,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index blocks_page_idx on blocks (page_id, position);
create trigger blocks_set_updated_at
  before update on blocks
  for each row execute function set_updated_at();

-- ============================================================
-- media
-- ============================================================
create table media_assets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  property_id   uuid references properties(id) on delete set null,
  storage_path  text not null,
  alt_text      text not null default '',
  caption       text,
  mime_type     text,
  width         integer,
  height        integer,
  file_size     integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint media_assets_path_unique unique (company_id, storage_path)
);

create trigger media_assets_set_updated_at
  before update on media_assets
  for each row execute function set_updated_at();

-- ============================================================
-- integrations (credentials never selected by anon)
-- ============================================================
create table integration_accounts (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  provider     text not null,
  status       text not null default 'disconnected',
  credentials  jsonb not null default '{}'::jsonb,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint integration_accounts_provider_unique unique (company_id, provider),
  constraint integration_accounts_provider_check
    check (provider in ('hospitable', 'pricelabs', 'airdna', 'stripe', 'airbnb')),
  constraint integration_accounts_status_check
    check (status in ('disconnected', 'connected', 'error'))
);

create trigger integration_accounts_set_updated_at
  before update on integration_accounts
  for each row execute function set_updated_at();

-- ============================================================
-- guests (company-scoped — not a global identity)
-- ============================================================
create table guests (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  email                 text,
  phone                 text,
  first_name            text,
  last_name             text,
  trust_status          text not null default 'stub',
  opted_in              boolean not null default false,
  source                text not null default 'manual',
  hospitable_guest_id   text,
  incident_flag         boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint guests_trust_check
    check (trust_status in ('stub', 'captured', 'invited', 'trusted', 'revoked')),
  constraint guests_source_check
    check (source in ('airbnb', 'hospitable', 'direct', 'manual'))
);

create unique index guests_company_email_idx
  on guests (company_id, lower(email))
  where email is not null;

create trigger guests_set_updated_at
  before update on guests
  for each row execute function set_updated_at();

create table guest_magic_links (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table guest_sessions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- bookings we originate (direct)
-- ============================================================
create table bookings (
  id                         uuid primary key default gen_random_uuid(),
  company_id                 uuid not null references companies(id) on delete cascade,
  property_id                uuid not null references properties(id) on delete restrict,
  guest_id                   uuid not null references guests(id) on delete restrict,
  status                     text not null default 'pending',
  check_in                   date not null,
  check_out                  date not null,
  guests_count               integer not null default 1,
  currency                   char(3) not null default 'USD',
  accommodation_cents        integer not null default 0,
  cleaning_fee_cents         integer not null default 0,
  total_cents                integer not null default 0,
  quoted_nights              jsonb not null default '[]'::jsonb,
  stripe_checkout_session_id text,
  stripe_payment_intent_id   text,
  hospitable_reservation_id  text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint bookings_status_check
    check (status in ('pending', 'paid', 'confirmed', 'cancelled', 'failed')),
  constraint bookings_dates_check check (check_out > check_in)
);

create index bookings_company_idx on bookings (company_id);
create index bookings_property_idx on bookings (property_id);
create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- ============================================================
-- rate cache + AirDNA snapshots + reservation ingest
-- ============================================================
create table nightly_rates (
  property_id   uuid not null references properties(id) on delete cascade,
  company_id    uuid not null references companies(id) on delete cascade,
  stay_date     date not null,
  amount_cents  integer not null,
  currency      char(3) not null default 'USD',
  min_stay      integer,
  available     boolean,
  source        text not null default 'pricelabs',
  fetched_at    timestamptz not null default now(),
  primary key (property_id, stay_date)
);

create table airdna_snapshots (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  property_id  uuid not null references properties(id) on delete cascade,
  period       text not null default 'ltm',
  metrics      jsonb not null default '{}'::jsonb,
  fetched_at   timestamptz not null default now(),
  unique (property_id, period)
);

create table hospitable_reservations (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references companies(id) on delete cascade,
  property_id           uuid references properties(id) on delete set null,
  guest_id              uuid references guests(id) on delete set null,
  hospitable_id         text not null,
  platform              text,
  status                text,
  check_in              date,
  check_out             date,
  payload               jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (company_id, hospitable_id)
);

create trigger hospitable_reservations_set_updated_at
  before update on hospitable_reservations
  for each row execute function set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table companies enable row level security;
alter table properties enable row level security;
alter table pages enable row level security;
alter table blocks enable row level security;
alter table media_assets enable row level security;
alter table integration_accounts enable row level security;
alter table guests enable row level security;
alter table guest_magic_links enable row level security;
alter table guest_sessions enable row level security;
alter table bookings enable row level security;
alter table nightly_rates enable row level security;
alter table airdna_snapshots enable row level security;
alter table hospitable_reservations enable row level security;

create policy companies_public_active on companies
  for select to anon, authenticated
  using (status = 'active');

create policy properties_public_published on properties
  for select to anon, authenticated
  using (status = 'published');

create policy pages_public_published on pages
  for select to anon, authenticated
  using (status = 'published');

create policy blocks_public_published on blocks
  for select to anon, authenticated
  using (
    exists (
      select 1 from pages p
      where p.id = page_id and p.status = 'published'
    )
  );

create policy media_public_read on media_assets
  for select to anon, authenticated
  using (
    exists (
      select 1 from companies c
      where c.id = company_id and c.status = 'active'
    )
  );

create policy nightly_rates_public_published on nightly_rates
  for select to anon, authenticated
  using (
    exists (
      select 1 from properties p
      where p.id = property_id and p.status = 'published'
    )
  );

-- Secrets and PII: no anon/authenticated policies. Service role only.
revoke all on table integration_accounts, guests, guest_magic_links,
  guest_sessions, bookings, airdna_snapshots, hospitable_reservations
from anon, authenticated;

-- Staff writes go through the service role after Better Auth checks.
-- is_member is the company-scoped door for a later authenticated JWT path
-- (Better Auth org id lives on companies.auth_org_id).
create or replace function is_member(_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from companies c
    join member m on m."organizationId" = c.auth_org_id
    where c.id = _company_id
      and m."userId" = coalesce(
        current_setting('request.jwt.claim.sub', true),
        auth.uid()::text
      )
  );
$$;

revoke all on function is_member(uuid) from public;
grant execute on function is_member(uuid) to authenticated, service_role;

create policy companies_member_read on companies
  for select to authenticated
  using (is_member(id));

create policy properties_member_all on properties
  for all to authenticated
  using (is_member(company_id))
  with check (is_member(company_id));

create policy pages_member_all on pages
  for all to authenticated
  using (is_member(company_id))
  with check (is_member(company_id));

create policy blocks_member_all on blocks
  for all to authenticated
  using (is_member(company_id))
  with check (is_member(company_id));

create policy media_member_all on media_assets
  for all to authenticated
  using (is_member(company_id))
  with check (is_member(company_id));

create policy nightly_rates_member_all on nightly_rates
  for all to authenticated
  using (is_member(company_id))
  with check (is_member(company_id));

-- Storage paths are always /{company_id}/...
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit)
  values ('media', 'media', true, 52428800)
  on conflict (id) do nothing;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'media_public_read'
  ) then
    create policy media_public_read
      on storage.objects for select
      using (bucket_id = 'media');
  end if;
exception
  when undefined_table then
    null;
  when undefined_object then
    null;
end $$;
-- Tenant zero. Adding another host is another companies row.

insert into companies (
  name,
  slug,
  custom_domain,
  plan,
  status,
  wordmark,
  wordmark_sub,
  tagline,
  theme
) values (
  'DNS Realworks',
  'dns-realworks',
  'dnsrealworks.com',
  'flagship',
  'active',
  'DNS Realworks',
  'Owned stays',
  'Houses we own, kept with care.',
  '{
    "color": {
      "background": "#f3efe6",
      "foreground": "#1c1914",
      "card": "#fffdf8",
      "cardForeground": "#1c1914",
      "popover": "#fffdf8",
      "popoverForeground": "#1c1914",
      "primary": "#6b4f2a",
      "primaryForeground": "#fffdf8",
      "secondary": "#e8e1d4",
      "secondaryForeground": "#1c1914",
      "muted": "#e8e1d4",
      "mutedForeground": "#6f675c",
      "accent": "#e8e1d4",
      "accentForeground": "#1c1914",
      "destructive": "#b42318",
      "border": "#d9d0c0",
      "input": "#cfc5b4",
      "ring": "#6b4f2a"
    },
    "font": { "display": "fraunces", "body": "figtree", "eyebrow": "figtree" },
    "radius": "0.5rem",
    "spacing": { "unit": "0.25rem" },
    "elevation": { "card": "0 1px 2px rgb(28 25 20 / 0.06)" },
    "photography": { "treatment": "warm" }
  }'::jsonb
);

insert into pages (company_id, slug, title, status, template, position)
select id, 'home', 'Home', 'published', 'home', 0 from companies where slug = 'dns-realworks';

insert into pages (company_id, slug, title, status, template, position)
select id, 'about', 'About', 'published', 'inner', 1 from companies where slug = 'dns-realworks';

insert into pages (company_id, slug, title, status, template, position)
select id, 'contact', 'Contact', 'published', 'inner', 2 from companies where slug = 'dns-realworks';

insert into blocks (company_id, page_id, type, position, data)
select
  c.id,
  p.id,
  'homeHero',
  0,
  jsonb_build_object(
    'eyebrow', 'Owned stays',
    'title', 'Houses we own, kept with care.',
    'body', 'DNS Realworks is a small portfolio of properties we operate ourselves. Browse the collection. Returning guests may book with us directly.'
  )
from companies c
join pages p on p.company_id = c.id and p.slug = 'home'
where c.slug = 'dns-realworks';

insert into blocks (company_id, page_id, type, position, data)
select
  c.id,
  p.id,
  'richText',
  0,
  jsonb_build_object(
    'title', 'About',
    'body', 'We buy, restore, and host a handful of houses. The brand is the operator. The properties are the assets.'
  )
from companies c
join pages p on p.company_id = c.id and p.slug = 'about'
where c.slug = 'dns-realworks';

insert into blocks (company_id, page_id, type, position, data)
select
  c.id,
  p.id,
  'contactPanel',
  0,
  jsonb_build_object(
    'title', 'Contact',
    'body', 'Questions about a stay or a property? Write us.'
  )
from companies c
join pages p on p.company_id = c.id and p.slug = 'contact'
where c.slug = 'dns-realworks';
