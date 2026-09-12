insert into public.stock_provider_symbols (
  stock_id,
  provider,
  provider_symbol,
  is_primary,
  verified_at,
  metadata
)
select
  existing.stock_id,
  case market.code when 'GPW' then 'STOOQ' else 'MASSIVE' end,
  case market.code
    when 'GPW' then regexp_replace(existing.provider_symbol, '\.WAR$', '', 'i')
    else regexp_replace(existing.provider_symbol, '\.US$', '', 'i')
  end,
  true,
  existing.verified_at,
  existing.metadata || jsonb_build_object(
    'migratedFrom', 'EODHD',
    'migratedAt', now()
  )
from public.stock_provider_symbols as existing
join public.stocks as stock on stock.id = existing.stock_id
join public.markets as market on market.id = stock.market_id
where existing.provider = 'EODHD'
  and existing.is_primary
  and market.code in ('GPW', 'USA')
on conflict (provider, provider_symbol) do update
set verified_at = excluded.verified_at,
    metadata = public.stock_provider_symbols.metadata || excluded.metadata,
    updated_at = now()
where public.stock_provider_symbols.stock_id = excluded.stock_id;

create or replace function public.upsert_eod_market_quote(
  p_stock_id uuid,
  p_trading_date date,
  p_open numeric,
  p_high numeric,
  p_low numeric,
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
  v_affected_rows integer;
  v_previous_close numeric := p_previous_close;
  v_day_change_pct numeric := p_day_change_pct;
begin
  if p_trading_date is null then
    raise exception using errcode = '22023', message = 'trading date is required';
  end if;

  if v_previous_close is null then
    select history.close into v_previous_close
    from public.stock_prices as history
    where history.stock_id = p_stock_id
      and history.provider = p_provider
      and history.trading_date < p_trading_date
    order by history.trading_date desc
    limit 1;
  end if;

  if v_day_change_pct is null and v_previous_close > 0 then
    v_day_change_pct := ((p_price - v_previous_close) / v_previous_close) * 100;
  end if;

  insert into public.stock_prices (
    stock_id,
    trading_date,
    open,
    high,
    low,
    close,
    adjusted_close,
    volume,
    currency,
    provider
  ) values (
    p_stock_id,
    p_trading_date,
    p_open,
    p_high,
    p_low,
    p_price,
    null,
    p_volume,
    p_currency,
    p_provider
  )
  on conflict (stock_id, trading_date, provider) do nothing;

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
    v_previous_close,
    v_day_change_pct,
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

  get diagnostics v_affected_rows = row_count;
  return v_affected_rows = 1;
end;
$$;

revoke all on function public.upsert_eod_market_quote(
  uuid, date, numeric, numeric, numeric, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, character, timestamptz, timestamptz,
  text, text, text
) from public, anon, authenticated;
grant execute on function public.upsert_eod_market_quote(
  uuid, date, numeric, numeric, numeric, numeric, numeric, numeric,
  numeric, numeric, numeric, numeric, character, timestamptz, timestamptz,
  text, text, text
) to service_role;

create or replace function public.configure_market_sync_cron()
returns bigint
language plpgsql
security definer
set search_path = public, cron, vault, pg_temp
as $$
declare
  v_job_id bigint;
  v_existing_job_id bigint;
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'stock_monitor_app_url'
      and decrypted_secret ~ '^https://[^/@[:space:]?#]+/?$'
  ) or not exists (
    select 1 from vault.decrypted_secrets
    where name = 'stock_monitor_cron_secret'
      and char_length(decrypted_secret) >= 32
  ) then
    raise exception using errcode = '22023', message = 'scheduler Vault configuration is incomplete';
  end if;

  select jobid into v_existing_job_id
  from cron.job
  where jobname = 'stock-monitor-market-sync'
  limit 1;
  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  select cron.schedule(
    'stock-monitor-market-sync',
    '30 18,23 * * 1-5',
    'select public.enqueue_market_sync();'
  ) into v_job_id;
  return v_job_id;
end;
$$;

comment on function public.configure_market_sync_cron() is
  'Configures weekday EOD synchronization at 18:30 and 23:30 UTC.';
