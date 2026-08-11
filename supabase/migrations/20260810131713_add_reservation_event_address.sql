alter table public.reservations
  add column if not exists event_address text;
