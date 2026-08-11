alter table public.reservations
  add column if not exists logistics_status text not null default 'scheduled'
  check (logistics_status in ('scheduled', 'preparing', 'delivered', 'returned'));
