-- Permite que cada cliente autenticado consulte somente reservas vinculadas ao
-- seu próprio cadastro. A política administrativa existente continua valendo.
grant select on public.reservations to authenticated;
grant select on public.reservation_items to authenticated;

drop policy if exists "Clientes leem as proprias reservas" on public.reservations;
create policy "Clientes leem as proprias reservas"
  on public.reservations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.customers
      where customers.id = reservations.customer_id
        and customers.auth_user_id = (select auth.uid())
        and customers.approval_status = 'approved'
    )
  );

drop policy if exists "Clientes leem itens das proprias reservas" on public.reservation_items;
create policy "Clientes leem itens das proprias reservas"
  on public.reservation_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.reservations
      join public.customers on customers.id = reservations.customer_id
      where reservations.id = reservation_items.reservation_id
        and customers.auth_user_id = (select auth.uid())
        and customers.approval_status = 'approved'
    )
  );
