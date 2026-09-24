drop policy if exists "Administradores leem aceites de contrato" on public.reservation_contract_acceptances;
drop policy if exists "Clientes leem os proprios aceites de contrato" on public.reservation_contract_acceptances;
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
