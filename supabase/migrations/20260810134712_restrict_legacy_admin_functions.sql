-- Estas funcoes foram substituidas por consultas diretas protegidas por RLS.
-- Revogar o EXECUTE impede que continuem expostas pela Data API do Supabase.
do $$
declare
  legacy_function record;
begin
  for legacy_function in
    select procedure.oid::regprocedure as signature
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any (array[
        'get_admin_reservations',
        'get_admin_reservation_details',
        'confirm_reservation',
        'cancel_reservation',
        'delete_cancelled_reservation'
      ])
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      legacy_function.signature
    );
  end loop;
end;
$$;
