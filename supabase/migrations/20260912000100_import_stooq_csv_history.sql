create or replace function public.import_stooq_csv_prices(
  p_stock_id uuid,
  p_rows jsonb,
  p_price text,
  p_previous_close text,
  p_day_change_pct text,
  p_volume text,
  p_as_of timestamptz,
  p_received_at timestamptz,
  p_quality_status text
)
returns table(history_inserted_count integer, quote_updated boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_history_inserted integer;
  v_quote_updated integer;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception using errcode = '22023', message = 'Stooq CSV rows are required';
  end if;

  if not exists (
    select 1
    from public.stocks as stock
    join public.markets as market on market.id = stock.market_id
    where stock.id = p_stock_id
      and market.code = 'GPW'
      and stock.currency = 'PLN'
  ) then
    raise exception using errcode = '22023', message = 'Stooq CSV requires a GPW stock';
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
  )
  select
    p_stock_id,
    row.trading_date::date,
    row.open::numeric,
    row.high::numeric,
    row.low::numeric,
    row.close::numeric,
    row.adjusted_close::numeric,
    row.volume::numeric,
    'PLN',
    'Stooq CSV'
  from jsonb_to_recordset(p_rows) as row(
    trading_date text,
    open text,
    high text,
    low text,
    close text,
    adjusted_close text,
    volume text
  )
  on conflict (stock_id, trading_date, provider) do nothing;

  get diagnostics v_history_inserted = row_count;

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
    p_price::numeric,
    p_previous_close::numeric,
    p_day_change_pct::numeric,
    null,
    p_volume::numeric,
    null,
    null,
    'PLN',
    p_as_of,
    p_received_at,
    'Stooq CSV',
    null,
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

  get diagnostics v_quote_updated = row_count;

  return query select v_history_inserted, v_quote_updated = 1;
end;
$$;

revoke all on function public.import_stooq_csv_prices(
  uuid, jsonb, text, text, text, text, timestamptz, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.import_stooq_csv_prices(
  uuid, jsonb, text, text, text, text, timestamptz, timestamptz, text
) to service_role;

comment on function public.import_stooq_csv_prices(
  uuid, jsonb, text, text, text, text, timestamptz, timestamptz, text
) is 'Atomically imports idempotent Stooq CSV history and conditionally advances the latest GPW quote.';
