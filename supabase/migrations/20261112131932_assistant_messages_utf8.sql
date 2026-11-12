create or replace function public.assistant_confirm_reservation(p_draft_id uuid) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  d public.assistant_reservation_drafts%rowtype;
  c public.customers%rowtype;
  p public.products%rowtype;
  item jsonb;
  event_day date;
  available integer;
  created_id bigint;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso negado'; end if;
  select * into d from public.assistant_reservation_drafts where id = p_draft_id and created_by = auth.uid() for update;
  if not found then raise exception 'Proposta não encontrada'; end if;
  if d.reservation_id is not null then return d.reservation_id; end if;
  if d.expires_at < now() then raise exception 'Proposta expirada. Peça ao assistente para prepará-la novamente.'; end if;
  event_day := (d.payload->>'eventDate')::date;
  if event_day < (now() at time zone 'America/Sao_Paulo')::date then raise exception 'Escolha uma data atual ou futura'; end if;
  select * into c from public.customers where id = (d.payload->>'customerId')::bigint;
  if not found then raise exception 'Cliente não encontrado'; end if;
  if c.name is distinct from d.payload->>'customerName' or coalesce(c.phone, '') is distinct from d.payload->>'customerPhone' then
    raise exception 'Cadastro do cliente mudou. Prepare outra proposta.';
  end if;
  if jsonb_array_length(d.payload->'items') not between 1 and 40 then raise exception 'Itens inválidos'; end if;
  -- Ordem fixa dos bloqueios evita deadlocks entre confirmações do assistente.
  perform id from public.products where id in (
    select (value->>'productId')::bigint from jsonb_array_elements(d.payload->'items')
  ) order by id for update;
  for item in select value from jsonb_array_elements(d.payload->'items') loop
    select * into p from public.products where id = (item->>'productId')::bigint;
    if not found or not p.active or p.maintenance_status <> 'disponivel' then raise exception 'Produto indisponível'; end if;
    if p.price is distinct from (item->>'unitPrice')::numeric then raise exception 'Um preço mudou. Prepare outra proposta para conferir os valores.'; end if;
    if (item->>'quantity')::integer < 1 then raise exception 'Quantidade inválida'; end if;
    select a.available_quantity into available from public.get_product_availability(event_day) a where a.product_id = p.id;
    if available is null or available < (item->>'quantity')::integer then raise exception 'Estoque insuficiente para a data. Prepare outra proposta.'; end if;
  end loop;
  insert into public.reservations(customer_id, customer_name, customer_phone, event_date, event_address, service_fee, notes, status)
  values(c.id, c.name, c.phone, event_day, d.payload->>'eventAddress', (d.payload->>'serviceFee')::numeric,
    'Criada pelo assistente com revisão do administrador. ' || coalesce(d.payload->>'notes', ''), 'pending') returning id into created_id;
  insert into public.reservation_items(reservation_id, product_id, quantity, unit_price)
  select created_id, (value->>'productId')::bigint, (value->>'quantity')::integer, (value->>'unitPrice')::numeric
  from jsonb_array_elements(d.payload->'items');
  update public.assistant_reservation_drafts set reservation_id = created_id where id = p_draft_id;
  return created_id;
end;
$$;
revoke all on function public.assistant_confirm_reservation(uuid) from public, anon;
grant execute on function public.assistant_confirm_reservation(uuid) to authenticated;
