create unique index stock_provider_symbols_one_primary_per_provider_idx
  on public.stock_provider_symbols (stock_id, provider)
  where is_primary;

create index watchlist_items_user_archive_status_idx
  on public.watchlist_items (user_id, archived_at, current_status_id);

create index monitoring_results_stock_analyzed_idx
  on public.monitoring_results (stock_id, analyzed_at desc)
  where deleted_at is null;

create index price_levels_stock_active_kind_idx
  on public.price_levels (stock_id, is_active, kind);

create index notes_stock_pinned_created_idx
  on public.notes (stock_id, is_pinned desc, created_at desc)
  where deleted_at is null;

create index stock_prices_stock_trading_date_idx
  on public.stock_prices (stock_id, trading_date desc);

alter table public.markets enable row level security;
alter table public.stocks enable row level security;
alter table public.stock_provider_symbols enable row level security;
alter table public.status_definitions enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.market_quotes enable row level security;
alter table public.stock_prices enable row level security;
alter table public.price_levels enable row level security;
alter table public.monitoring_results enable row level security;
alter table public.investment_theses enable row level security;
alter table public.notes enable row level security;
alter table public.sync_runs enable row level security;
alter table public.audit_events enable row level security;

create policy markets_authenticated_read
on public.markets for select to authenticated
using (true);

create policy stocks_authenticated_read
on public.stocks for select to authenticated
using (true);

create policy stock_provider_symbols_authenticated_read
on public.stock_provider_symbols for select to authenticated
using (true);

create policy market_quotes_authenticated_read
on public.market_quotes for select to authenticated
using (true);

create policy stock_prices_authenticated_read
on public.stock_prices for select to authenticated
using (true);

create policy sync_runs_authenticated_read
on public.sync_runs for select to authenticated
using (true);

create policy status_definitions_owner_select
on public.status_definitions for select to authenticated
using (user_id = auth.uid());

create policy status_definitions_owner_insert
on public.status_definitions for insert to authenticated
with check (user_id = auth.uid());

create policy status_definitions_owner_update
on public.status_definitions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy status_definitions_owner_delete
on public.status_definitions for delete to authenticated
using (user_id = auth.uid());

create policy watchlist_items_owner_select
on public.watchlist_items for select to authenticated
using (user_id = auth.uid());

create policy watchlist_items_owner_insert
on public.watchlist_items for insert to authenticated
with check (user_id = auth.uid());

create policy watchlist_items_owner_update
on public.watchlist_items for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy price_levels_owner_select
on public.price_levels for select to authenticated
using (user_id = auth.uid());

create policy price_levels_owner_insert
on public.price_levels for insert to authenticated
with check (user_id = auth.uid());

create policy price_levels_owner_update
on public.price_levels for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy monitoring_results_owner_select
on public.monitoring_results for select to authenticated
using (user_id = auth.uid());

create policy monitoring_results_owner_insert
on public.monitoring_results for insert to authenticated
with check (user_id = auth.uid());

create policy monitoring_results_owner_soft_delete
on public.monitoring_results for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy investment_theses_owner_select
on public.investment_theses for select to authenticated
using (
  exists (
    select 1
    from public.monitoring_results
    where monitoring_results.id = investment_theses.monitoring_result_id
      and monitoring_results.user_id = auth.uid()
  )
);

create policy investment_theses_owner_insert
on public.investment_theses for insert to authenticated
with check (
  exists (
    select 1
    from public.monitoring_results
    where monitoring_results.id = investment_theses.monitoring_result_id
      and monitoring_results.user_id = auth.uid()
  )
);

create policy notes_owner_select
on public.notes for select to authenticated
using (user_id = auth.uid());

create policy notes_owner_insert
on public.notes for insert to authenticated
with check (user_id = auth.uid());

create policy notes_owner_update
on public.notes for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy audit_events_owner_select
on public.audit_events for select to authenticated
using (user_id = auth.uid());

create policy audit_events_owner_insert
on public.audit_events for insert to authenticated
with check (user_id = auth.uid());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.markets to authenticated;
grant select on public.stocks to authenticated;
grant select on public.stock_provider_symbols to authenticated;
grant select on public.market_quotes to authenticated;
grant select on public.stock_prices to authenticated;
grant select on public.sync_runs to authenticated;
grant select, insert, update, delete on public.status_definitions to authenticated;
grant select, insert, update on public.watchlist_items to authenticated;
grant select, insert, update on public.price_levels to authenticated;
grant select, insert, update (deleted_at) on public.monitoring_results to authenticated;
grant select, insert on public.investment_theses to authenticated;
grant select, insert, update on public.notes to authenticated;
grant select, insert on public.audit_events to authenticated;
grant all on all tables in schema public to service_role;

grant usage on schema public to anon, authenticated, service_role;
