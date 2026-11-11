-- House guide agent. Messages are source material for drafts.
-- Publishing a draft is a staff action. Nothing here sends a guest reply
-- or changes trust, price, or calendar.

create table guest_messages (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references companies(id) on delete cascade,
  property_id             uuid references properties(id) on delete set null,
  hospitable_reservation_id text,
  hospitable_message_id   text not null,
  direction               text not null,
  body                    text not null,
  source                  text,
  sent_at                 timestamptz,
  guide_checked_at        timestamptz,
  payload                 jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  constraint guest_messages_direction_check
    check (direction in ('guest', 'host')),
  constraint guest_messages_company_message_unique
    unique (company_id, hospitable_message_id)
);

create index guest_messages_property_idx
  on guest_messages (company_id, property_id, sent_at desc);

create table house_guide_drafts (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies(id) on delete cascade,
  property_id         uuid not null references properties(id) on delete cascade,
  status              text not null default 'pending',
  title               text not null,
  body                text not null,
  reason              text,
  source_message_ids  text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint house_guide_drafts_status_check
    check (status in ('pending', 'published', 'discarded'))
);

create index house_guide_drafts_property_idx
  on house_guide_drafts (company_id, property_id, status, created_at desc);

create trigger house_guide_drafts_set_updated_at
  before update on house_guide_drafts
  for each row execute function set_updated_at();

alter table guest_messages enable row level security;
alter table house_guide_drafts enable row level security;

revoke all on table guest_messages, house_guide_drafts from anon, authenticated;

update pages
set title = 'House guide'
where slug = 'stay'
  and title = 'The stay';
