-- Ordinary status management uses deactivation, preserving historical references.
revoke delete on public.status_definitions from authenticated;
drop policy status_definitions_owner_delete on public.status_definitions;

-- Future Add Stock can insert a canonical instrument and provider mapping with
-- the user JWT. Existing shared metadata and quotes cannot be overwritten.
grant insert on public.stocks, public.stock_provider_symbols to authenticated;
create policy stocks_authenticated_insert on public.stocks
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy stock_provider_symbols_authenticated_insert on public.stock_provider_symbols
  for insert to authenticated with check ((select auth.uid()) is not null);

-- Future objects must opt into Data API access explicitly, including RPCs.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;
