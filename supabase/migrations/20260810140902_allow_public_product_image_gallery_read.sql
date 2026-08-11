grant select on table public.product_images to anon;

drop policy if exists "Imagens de produtos são públicas" on public.product_images;
create policy "Imagens de produtos são públicas"
  on public.product_images
  for select
  to anon, authenticated
  using (true);
