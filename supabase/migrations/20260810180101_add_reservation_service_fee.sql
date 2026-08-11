alter table public.reservations
  add column if not exists service_fee numeric(12, 2) not null default 0
  check (service_fee >= 0);
