alter table public.products
  add column if not exists search_keywords text[] not null default '{}';
