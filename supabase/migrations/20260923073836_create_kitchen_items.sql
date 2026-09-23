-- "Mano virtuvė": each signed-in user's list of products at home.
begin;

create table public.kitchen_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);

-- One copy of a product per user, ignoring case and surrounding spaces.
create unique index kitchen_items_user_name_key
  on public.kitchen_items (user_id, lower(btrim(name)));

alter table public.kitchen_items enable row level security;

revoke all on table public.kitchen_items from public, anon, authenticated;
grant select, insert, delete on table public.kitchen_items to authenticated;

create policy kitchen_items_select_own
  on public.kitchen_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy kitchen_items_insert_own
  on public.kitchen_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy kitchen_items_delete_own
  on public.kitchen_items for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
