create table if not exists public.reservation_contract_acceptances (
  id bigint generated always as identity primary key,
  reservation_id bigint not null unique references public.reservations(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  accepted_by_user uuid not null references auth.users(id) on delete restrict,
  signer_name text not null check (char_length(trim(signer_name)) >= 3),
  signer_document text not null check (char_length(regexp_replace(signer_document, '[^0-9]', '', 'g')) between 8 and 14),
  terms_version text not null default '2026-09',
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.reservation_contract_acceptances is
  'Registro imutavel do aceite digital do contrato de uma reserva pelo cliente.';

create index if not exists reservation_contract_acceptances_customer_idx
  on public.reservation_contract_acceptances (customer_id, accepted_at desc);

create index if not exists reservation_contract_acceptances_user_idx
  on public.reservation_contract_acceptances (accepted_by_user, accepted_at desc);

alter table public.reservation_contract_acceptances enable row level security;

grant select, insert on public.reservation_contract_acceptances to authenticated;
grant all on public.reservation_contract_acceptances to service_role;
grant usage, select on sequence public.reservation_contract_acceptances_id_seq to authenticated, service_role;

drop policy if exists "Administradores e clientes leem aceites autorizados" on public.reservation_contract_acceptances;
create policy "Administradores e clientes leem aceites autorizados"
  on public.reservation_contract_acceptances
  for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      accepted_by_user = (select auth.uid())
      and exists (
        select 1
        from public.customers
        where customers.id = reservation_contract_acceptances.customer_id
          and customers.auth_user_id = (select auth.uid())
          and customers.approval_status = 'approved'
      )
    )
  );

drop policy if exists "Clientes aceitam contratos das proprias reservas" on public.reservation_contract_acceptances;
create policy "Clientes aceitam contratos das proprias reservas"
  on public.reservation_contract_acceptances
  for insert
  to authenticated
  with check (
    accepted_by_user = (select auth.uid())
    and exists (
      select 1
      from public.reservations
      join public.customers on customers.id = reservations.customer_id
      where reservations.id = reservation_contract_acceptances.reservation_id
        and reservations.customer_id = reservation_contract_acceptances.customer_id
        and reservations.status = 'confirmed'
        and customers.auth_user_id = (select auth.uid())
        and customers.approval_status = 'approved'
    )
  );

create or replace function public.stamp_contract_acceptance()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.accepted_by_user := (select auth.uid());
  new.accepted_at := now();
  new.created_at := now();
  new.terms_version := '2026-09';
  return new;
end;
$$;

revoke all on function public.stamp_contract_acceptance() from public, anon, authenticated;

drop trigger if exists stamp_contract_acceptance_before_insert on public.reservation_contract_acceptances;
create trigger stamp_contract_acceptance_before_insert
before insert on public.reservation_contract_acceptances
for each row execute function public.stamp_contract_acceptance();

alter table public.admin_notifications
  drop constraint if exists admin_notifications_type_check;

alter table public.admin_notifications
  add constraint admin_notifications_type_check
  check (type in ('customer_pending', 'reservation_pending', 'contract_accepted'));

create or replace function public.notify_admin_contract_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.admin_notifications (type, title, message, href)
  values (
    'contract_accepted',
    format('Contrato aceito: reserva #%s', new.reservation_id),
    format('%s confirmou o contrato digital em %s.', new.signer_name, to_char(new.accepted_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')),
    format('/admin/reservas/%s', new.reservation_id)
  );

  return new;
end;
$$;

revoke all on function public.notify_admin_contract_acceptance() from public, anon, authenticated;

drop trigger if exists notify_admin_contract_acceptance_after_insert on public.reservation_contract_acceptances;
create trigger notify_admin_contract_acceptance_after_insert
after insert on public.reservation_contract_acceptances
for each row execute function public.notify_admin_contract_acceptance();
