create table if not exists public.admin_notifications (
  id bigint generated always as identity primary key,
  type text not null check (type in ('customer_pending', 'reservation_pending')),
  title text not null,
  message text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_notifications_unread_created_at_idx
  on public.admin_notifications (created_at desc)
  where read_at is null;

alter table public.admin_notifications enable row level security;

grant select, update, delete on public.admin_notifications to authenticated;

drop policy if exists "Administradores leem notificacoes" on public.admin_notifications;
create policy "Administradores leem notificacoes"
  on public.admin_notifications
  for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Administradores atualizam notificacoes" on public.admin_notifications;
create policy "Administradores atualizam notificacoes"
  on public.admin_notifications
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Administradores excluem notificacoes" on public.admin_notifications;
create policy "Administradores excluem notificacoes"
  on public.admin_notifications
  for delete
  to authenticated
  using ((select public.is_admin()));

create or replace function public.notify_admin_about_pending_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'pending' then
    insert into public.admin_notifications (type, title, message, href)
    values (
      'customer_pending',
      'Novo cadastro de cliente',
      coalesce(new.name, 'Um cliente') || ' solicitou aprovação para acessar a área do cliente.',
      '/admin/clientes'
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_admin_about_pending_customer() from public, anon, authenticated;

drop trigger if exists on_customer_pending_notify_admin on public.customers;
create trigger on_customer_pending_notify_admin
  after insert on public.customers
  for each row execute procedure public.notify_admin_about_pending_customer();

create or replace function public.notify_admin_about_pending_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.admin_notifications (type, title, message, href)
    values (
      'reservation_pending',
      'Nova reserva pendente',
      'A reserva #' || new.id || ' para ' || to_char(new.event_date, 'DD/MM/YYYY') || ' precisa de atenção.',
      '/admin/reservas/' || new.id
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_admin_about_pending_reservation() from public, anon, authenticated;

drop trigger if exists on_reservation_pending_notify_admin on public.reservations;
create trigger on_reservation_pending_notify_admin
  after insert on public.reservations
  for each row execute procedure public.notify_admin_about_pending_reservation();
