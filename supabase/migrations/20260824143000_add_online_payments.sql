create table if not exists public.online_payment_attempts (
  id bigint generated always as identity primary key,
  reservation_id bigint not null references public.reservations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  provider text not null check (provider in ('mercado_pago')),
  external_reference text not null unique,
  preference_id text unique,
  provider_payment_id text unique,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'error')),
  checkout_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists online_payment_attempts_reservation_created_idx
  on public.online_payment_attempts (reservation_id, created_at desc);

alter table public.online_payment_attempts enable row level security;

grant select on public.online_payment_attempts to authenticated;

drop policy if exists "Administradores leem tentativas de pagamento online" on public.online_payment_attempts;
create policy "Administradores leem tentativas de pagamento online"
  on public.online_payment_attempts
  for select
  to authenticated
  using ((select public.is_admin()));

alter table public.reservation_payments
  add column if not exists provider_payment_id text;

create unique index if not exists reservation_payments_provider_payment_id_key
  on public.reservation_payments (provider_payment_id)
  where provider_payment_id is not null;
