alter table public.customers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists approval_status text not null default 'approved',
  add column if not exists avatar_url text;

create unique index if not exists customers_auth_user_id_key
  on public.customers (auth_user_id)
  where auth_user_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_approval_status_check'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end;
$$;

alter table public.customers enable row level security;

grant select on public.customers to authenticated;
grant update (name, phone, address, avatar_url) on public.customers to authenticated;

drop policy if exists "Clientes acessam o próprio cadastro" on public.customers;
create policy "Clientes acessam o próprio cadastro"
  on public.customers
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

drop policy if exists "Clientes atualizam o próprio cadastro" on public.customers;
create policy "Clientes atualizam o próprio cadastro"
  on public.customers
  for update
  to authenticated
  using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

drop policy if exists "Administradores gerenciam clientes" on public.customers;
create policy "Administradores gerenciam clientes"
  on public.customers
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Se o contato já existia no cadastro interno com o mesmo e-mail,
  -- apenas vinculamos sua nova conta ao registro existente.
  update public.customers
  set auth_user_id = new.id
  where auth_user_id is null
    and new.email is not null
    and lower(email) = lower(new.email);

  if not found then
    insert into public.customers (
      auth_user_id,
      name,
      email,
      phone,
      address,
      approval_status,
      notes
    ) values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, 'Cliente'), '@', 1)),
      new.email,
      nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'address'), ''),
      'pending',
      'Cadastro criado pelo próprio cliente e aguardando aprovação.'
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.create_customer_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_create_customer_profile on auth.users;
create trigger on_auth_user_created_create_customer_profile
  after insert on auth.users
  for each row execute procedure public.create_customer_profile();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-avatars',
  'customer-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clientes enviam a própria foto" on storage.objects;
create policy "Clientes enviam a própria foto"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Clientes leem a própria foto" on storage.objects;
create policy "Clientes leem a própria foto"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Clientes atualizam a própria foto" on storage.objects;
create policy "Clientes atualizam a própria foto"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Clientes removem a própria foto" on storage.objects;
create policy "Clientes removem a própria foto"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'customer-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Administradores gerenciam fotos de clientes" on storage.objects;
create policy "Administradores gerenciam fotos de clientes"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'customer-avatars'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'customer-avatars'
    and (select public.is_admin())
  );
