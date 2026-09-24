-- Shopping list: missing recipe ingredients; "Nupirkau" moves an item to "Mano virtuvė".
begin;

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  recipe_name text check (recipe_name is null or char_length(btrim(recipe_name)) between 1 and 500),
  created_at timestamptz not null default now()
);

-- One copy of a product per user, ignoring case and surrounding spaces.
create unique index shopping_items_user_name_key
  on public.shopping_items (user_id, lower(btrim(name)));

alter table public.shopping_items enable row level security;

revoke all on table public.shopping_items from public, anon, authenticated;
grant select, insert, delete on table public.shopping_items to authenticated;

create policy shopping_items_select_own
  on public.shopping_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy shopping_items_insert_own
  on public.shopping_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy shopping_items_delete_own
  on public.shopping_items for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
