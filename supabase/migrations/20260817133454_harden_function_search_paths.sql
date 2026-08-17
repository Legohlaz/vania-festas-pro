-- O Security Advisor aponta funções cujo search_path não está definido.
-- Atualizamos todas as sobrecargas conhecidas sem alterar a assinatura,
-- a lógica ou as permissões de execução de cada uma delas.
do $$
declare
  function_signature text;
begin
  for function_signature in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'update_customers_updated_at',
        'validate_reservation_confirmation',
        'validate_reservation_item_availability'
      )
  loop
    execute format(
      'alter function %s set search_path = public, extensions',
      function_signature
    );
  end loop;
end;
$$;
