alter table public.reservations
  add column if not exists amount_paid numeric(12, 2) not null default 0
  check (amount_paid >= 0);
