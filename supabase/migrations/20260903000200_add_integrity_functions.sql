create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stocks_set_updated_at
before update on public.stocks
for each row execute function public.set_updated_at();

create trigger stock_provider_symbols_set_updated_at
before update on public.stock_provider_symbols
for each row execute function public.set_updated_at();

create trigger status_definitions_set_updated_at
before update on public.status_definitions
for each row execute function public.set_updated_at();

create trigger price_levels_set_updated_at
before update on public.price_levels
for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create or replace function public.protect_monitoring_history()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'monitoring results are append-only; use deleted_at for a soft delete';
  end if;

  if old.deleted_at is null
    and new.deleted_at is not null
    and (to_jsonb(new) - 'deleted_at') = (to_jsonb(old) - 'deleted_at') then
    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'monitoring results are immutable; create a superseding record instead';
end;
$$;

create trigger monitoring_results_protect_history
before update or delete on public.monitoring_results
for each row execute function public.protect_monitoring_history();

create or replace function public.protect_investment_thesis_history()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'investment theses are immutable; create a thesis on a new monitoring result instead';
end;
$$;

create trigger investment_theses_protect_history
before update or delete on public.investment_theses
for each row execute function public.protect_investment_thesis_history();

create or replace function public.reject_stale_market_quote()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.as_of <= old.as_of then
    return null;
  end if;

  return new;
end;
$$;

create trigger market_quotes_reject_stale
before update on public.market_quotes
for each row execute function public.reject_stale_market_quote();

create or replace function public.upsert_market_quote(
  p_stock_id uuid,
  p_price numeric,
  p_previous_close numeric,
  p_day_change_pct numeric,
  p_market_cap numeric,
  p_volume numeric,
  p_fifty_two_week_high numeric,
  p_fifty_two_week_low numeric,
  p_currency character(3),
  p_as_of timestamptz,
  p_received_at timestamptz,
  p_provider text,
  p_raw_hash text,
  p_quality_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected_rows integer;
begin
  insert into public.market_quotes (
    stock_id,
    price,
    previous_close,
    day_change_pct,
    market_cap,
    volume,
    fifty_two_week_high,
    fifty_two_week_low,
    currency,
    as_of,
    received_at,
    provider,
    raw_hash,
    quality_status
  ) values (
    p_stock_id,
    p_price,
    p_previous_close,
    p_day_change_pct,
    p_market_cap,
    p_volume,
    p_fifty_two_week_high,
    p_fifty_two_week_low,
    p_currency,
    p_as_of,
    p_received_at,
    p_provider,
    p_raw_hash,
    p_quality_status
  )
  on conflict (stock_id) do update
  set price = excluded.price,
      previous_close = excluded.previous_close,
      day_change_pct = excluded.day_change_pct,
      market_cap = excluded.market_cap,
      volume = excluded.volume,
      fifty_two_week_high = excluded.fifty_two_week_high,
      fifty_two_week_low = excluded.fifty_two_week_low,
      currency = excluded.currency,
      as_of = excluded.as_of,
      received_at = excluded.received_at,
      provider = excluded.provider,
      raw_hash = excluded.raw_hash,
      quality_status = excluded.quality_status
  where excluded.as_of > public.market_quotes.as_of;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

create or replace function public.initialize_default_statuses(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  inserted_count integer;
begin
  if p_user_id is null then
    raise exception using errcode = '22004', message = 'a Supabase Auth user id is required';
  end if;

  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception using errcode = '42501', message = 'statuses can only be initialized for the current user';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = '23503', message = 'the Supabase Auth user does not exist';
  end if;

  insert into public.status_definitions (
    user_id,
    slug,
    label,
    description,
    color_token,
    dashboard_group,
    sort_order
  )
  values
    (p_user_id, 'BUY_CANDIDATE', 'Buy Candidate', 'Attractive on fundamentals and price.', 'positive', 'opportunity', 10),
    (p_user_id, 'WATCH', 'Watch', 'Good company without the required margin of safety.', 'info', 'watch', 20),
    (p_user_id, 'WAIT_FOR_CORRECTION', 'Wait for Correction', 'Waiting for a lower entry price.', 'warning', 'watch', 30),
    (p_user_id, 'DEEP_DIVE', 'Deep Dive', 'Requires a complete investment analysis.', 'accent', 'research', 40),
    (p_user_id, 'PORTFOLIO', 'Portfolio', 'Currently held in the portfolio.', 'portfolio', 'portfolio', 50),
    (p_user_id, 'HOLD', 'Hold', 'Position does not currently require an increase.', 'neutral', 'portfolio', 60),
    (p_user_id, 'AVOID', 'Avoid', 'Does not currently satisfy the investment criteria.', 'negative', 'negative', 70),
    (p_user_id, 'KILL_THE_THESIS', 'Kill the Thesis', 'The investment thesis has been invalidated.', 'danger', 'negative', 80)
  on conflict (user_id, slug) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.protect_monitoring_history() from public, anon, authenticated;
revoke all on function public.protect_investment_thesis_history() from public, anon, authenticated;
revoke all on function public.reject_stale_market_quote() from public, anon, authenticated;
revoke all on function public.upsert_market_quote(
  uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  character, timestamptz, timestamptz, text, text, text
) from public, anon, authenticated;
revoke all on function public.initialize_default_statuses(uuid) from public, anon, authenticated;

grant execute on function public.upsert_market_quote(
  uuid, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  character, timestamptz, timestamptz, text, text, text
) to service_role;
grant execute on function public.initialize_default_statuses(uuid) to service_role;
