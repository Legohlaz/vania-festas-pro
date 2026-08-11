drop policy if exists "Administradores gerenciam imagens do bucket products" on storage.objects;

create policy "Administradores gerenciam imagens do bucket products"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'products'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'products'
    and (select public.is_admin())
  );
