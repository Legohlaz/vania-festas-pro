alter table public.online_payment_attempts
  drop constraint if exists online_payment_attempts_provider_check;

alter table public.online_payment_attempts
  add constraint online_payment_attempts_provider_check
  check (provider in ('mercado_pago', 'infinitepay'));

alter table public.online_payment_attempts
  add column if not exists provider_invoice_slug text;

create unique index if not exists online_payment_attempts_provider_invoice_slug_key
  on public.online_payment_attempts (provider_invoice_slug)
  where provider_invoice_slug is not null;
