-- Attach saved messages to the company guest so staff can read
-- that guest's thread. The public house guide stays separate.

alter table guest_messages
  add column guest_id uuid references guests(id) on delete set null;

create index guest_messages_guest_idx
  on guest_messages (company_id, guest_id, sent_at desc);

update guest_messages as message
set guest_id = reservation.guest_id
from hospitable_reservations as reservation
where message.company_id = reservation.company_id
  and message.hospitable_reservation_id = reservation.hospitable_id
  and reservation.guest_id is not null
  and message.guest_id is null;
