-- Remove excess table privileges on saved_recipes (TRUNCATE bypasses RLS).
-- Signed-in users keep only what the app uses: SELECT, INSERT, DELETE.
-- No rows are changed.
begin;

revoke all on table public.saved_recipes from public, anon, authenticated;
grant select, insert, delete on table public.saved_recipes to authenticated;

commit;
