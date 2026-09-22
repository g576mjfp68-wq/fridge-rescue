begin;

create table public.ai_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_recipe_name text not null
    check (char_length(btrim(original_recipe_name)) between 1 and 500),
  user_request text not null
    check (char_length(btrim(user_request)) between 1 and 2000),
  ai_result text not null
    check (char_length(btrim(ai_result)) between 1 and 100000),
  created_at timestamptz not null default now(),
  original_recipe_id text not null check (original_recipe_id ~ '^[0-9]{1,10}$'),
  time_minutes smallint not null check (time_minutes in (15, 30, 60)),
  servings smallint not null check (servings in (1, 2, 4)),
  preference text not null check (preference in ('simpler', 'cheaper', 'healthier', 'original'))
);

create index ai_recipes_user_created_idx
  on public.ai_recipes (user_id, created_at desc);

alter table public.ai_recipes enable row level security;

revoke all on table public.ai_recipes from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on table public.ai_recipes to authenticated;

create policy ai_recipes_select_own
  on public.ai_recipes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ai_recipes_insert_own
  on public.ai_recipes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ai_recipes_delete_own
  on public.ai_recipes for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
