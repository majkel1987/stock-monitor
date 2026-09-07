create table public.fx_rates (
  pair text not null,
  effective_date date not null,
  rate numeric(20, 8) not null,
  as_of timestamptz not null,
  received_at timestamptz not null default now(),
  provider text not null,
  primary key (pair, provider, effective_date),
  constraint fx_rates_pair_check check (pair = 'USDPLN'),
  constraint fx_rates_rate_check check (rate > 0),
  constraint fx_rates_provider_check check (btrim(provider) <> '')
);

create index fx_rates_latest_idx
  on public.fx_rates (pair, effective_date desc, received_at desc);

alter table public.fx_rates enable row level security;

create policy fx_rates_authenticated_read
on public.fx_rates for select to authenticated
using (true);

revoke all on public.fx_rates from anon, authenticated;
grant select on public.fx_rates to authenticated;
grant all on public.fx_rates to service_role;

create or replace function public.add_provider_stock_to_watchlist(
  p_market_code text,
  p_ticker text,
  p_name text,
  p_exchange text,
  p_currency character(3),
  p_isin text,
  p_provider text,
  p_provider_symbol text,
  p_status_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  outcome text,
  stock_id uuid,
  watchlist_item_id uuid
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.markets%rowtype;
  v_stock_id uuid;
  v_mapped_stock_id uuid;
  v_watchlist_item_id uuid;
  v_archived_at timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select * into v_market
  from public.markets as m
  where m.code = upper(btrim(p_market_code));

  if not found then
    return query select 'invalid_market'::text, null::uuid, null::uuid;
    return;
  end if;

  if not exists (
    select 1 from public.status_definitions as sd
    where sd.id = p_status_id
      and sd.user_id = v_user_id
      and sd.is_active
  ) then
    return query select 'invalid_status'::text, null::uuid, null::uuid;
    return;
  end if;

  if btrim(p_ticker) = ''
    or btrim(p_name) = ''
    or btrim(p_exchange) = ''
    or btrim(p_provider) = ''
    or btrim(p_provider_symbol) = ''
    or p_currency <> v_market.currency
    or jsonb_typeof(p_metadata) <> 'object'
  then
    return query select 'invalid_candidate'::text, null::uuid, null::uuid;
    return;
  end if;

  select sps.stock_id into v_mapped_stock_id
  from public.stock_provider_symbols as sps
  where sps.provider = upper(btrim(p_provider))
    and sps.provider_symbol = upper(btrim(p_provider_symbol));

  select s.id into v_stock_id
  from public.stocks as s
  where s.market_id = v_market.id
    and s.ticker = upper(btrim(p_ticker));

  if v_mapped_stock_id is not null then
    if v_stock_id is null then
      select s.id into v_stock_id
      from public.stocks as s
      where s.id = v_mapped_stock_id
        and s.market_id = v_market.id
        and s.ticker = upper(btrim(p_ticker));
    elsif v_stock_id <> v_mapped_stock_id then
      return query select 'mapping_conflict'::text, null::uuid, null::uuid;
      return;
    end if;

    if v_stock_id is null then
      return query select 'mapping_conflict'::text, null::uuid, null::uuid;
      return;
    end if;
  end if;

  if v_stock_id is null then
    insert into public.stocks (
      market_id, ticker, name, exchange, currency, isin, data_mode,
      metadata_updated_at
    ) values (
      v_market.id, upper(btrim(p_ticker)), btrim(p_name), btrim(p_exchange),
      p_currency, nullif(upper(btrim(p_isin)), ''), 'provider', now()
    )
    on conflict on constraint stocks_market_id_ticker_key do nothing
    returning id into v_stock_id;

    if v_stock_id is null then
      select s.id into v_stock_id
      from public.stocks as s
      where s.market_id = v_market.id
        and s.ticker = upper(btrim(p_ticker));
    end if;
  else
    update public.stocks as s
    set data_mode = 'provider',
        exchange = case when s.data_mode = 'manual' then btrim(p_exchange) else s.exchange end,
        isin = coalesce(s.isin, nullif(upper(btrim(p_isin)), '')),
        metadata_updated_at = now()
    where s.id = v_stock_id;
  end if;

  if v_stock_id is null then
    return query select 'conflict'::text, null::uuid, null::uuid;
    return;
  end if;

  begin
    insert into public.stock_provider_symbols (
      stock_id, provider, provider_symbol, is_primary, verified_at, metadata
    ) values (
      v_stock_id,
      upper(btrim(p_provider)),
      upper(btrim(p_provider_symbol)),
      not exists (
        select 1 from public.stock_provider_symbols as current_mapping
        where current_mapping.stock_id = v_stock_id
          and current_mapping.provider = upper(btrim(p_provider))
          and current_mapping.is_primary
      ),
      now(),
      p_metadata
    )
    on conflict (provider, provider_symbol) do update
      set verified_at = excluded.verified_at,
          metadata = excluded.metadata,
          is_primary = public.stock_provider_symbols.is_primary or excluded.is_primary,
          updated_at = now()
      where public.stock_provider_symbols.stock_id = excluded.stock_id;
  exception
    when unique_violation then
      return query select 'mapping_conflict'::text, null::uuid, null::uuid;
      return;
  end;

  select wi.id, wi.archived_at
  into v_watchlist_item_id, v_archived_at
  from public.watchlist_items as wi
  where wi.user_id = v_user_id
    and wi.stock_id = v_stock_id
  for update;

  if found then
    if v_archived_at is null then
      return query select 'already_active'::text, v_stock_id, v_watchlist_item_id;
      return;
    end if;

    update public.watchlist_items as wi
    set archived_at = null,
        current_status_id = p_status_id
    where wi.id = v_watchlist_item_id;
    return query select 'restored'::text, v_stock_id, v_watchlist_item_id;
    return;
  end if;

  insert into public.watchlist_items (user_id, stock_id, current_status_id)
  values (v_user_id, v_stock_id, p_status_id)
  returning id into v_watchlist_item_id;

  return query select 'created'::text, v_stock_id, v_watchlist_item_id;
end;
$$;

create or replace function public.submit_manual_market_quote(
  p_stock_id uuid,
  p_price numeric,
  p_currency character(3),
  p_as_of timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_stock_currency character(3);
  v_affected integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select s.currency into v_stock_currency
  from public.stocks as s
  join public.watchlist_items as wi on wi.stock_id = s.id
  where s.id = p_stock_id
    and wi.user_id = v_user_id;

  if not found then return 'invalid_stock'; end if;
  if p_price <= 0 then return 'invalid_price'; end if;
  if p_currency <> v_stock_currency then return 'currency_mismatch'; end if;
  if p_as_of is null or p_as_of > now() + interval '5 minutes' then
    return 'invalid_timestamp';
  end if;

  insert into public.market_quotes (
    stock_id, price, currency, as_of, received_at, provider, quality_status
  ) values (
    p_stock_id, p_price, p_currency, p_as_of, now(), 'manual', 'unknown'
  )
  on conflict (stock_id) do update
    set price = excluded.price,
        previous_close = null,
        day_change_pct = null,
        market_cap = null,
        volume = null,
        fifty_two_week_high = null,
        fifty_two_week_low = null,
        currency = excluded.currency,
        as_of = excluded.as_of,
        received_at = excluded.received_at,
        provider = excluded.provider,
        raw_hash = null,
        quality_status = excluded.quality_status
    where excluded.as_of > public.market_quotes.as_of;

  get diagnostics v_affected = row_count;
  return case when v_affected = 1 then 'saved' else 'quote_older_than_stored' end;
end;
$$;

create or replace function public.upsert_fx_rate(
  p_pair text,
  p_effective_date date,
  p_rate numeric,
  p_as_of timestamptz,
  p_received_at timestamptz,
  p_provider text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_affected integer;
begin
  insert into public.fx_rates (
    pair, effective_date, rate, as_of, received_at, provider
  ) values (
    p_pair, p_effective_date, p_rate, p_as_of, p_received_at, p_provider
  )
  on conflict (pair, provider, effective_date) do update
    set rate = excluded.rate,
        as_of = excluded.as_of,
        received_at = excluded.received_at
    where excluded.received_at > public.fx_rates.received_at;

  get diagnostics v_affected = row_count;
  return v_affected = 1;
end;
$$;

revoke all on function public.add_provider_stock_to_watchlist(
  text, text, text, text, character, text, text, text, uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.add_provider_stock_to_watchlist(
  text, text, text, text, character, text, text, text, uuid, jsonb
) to authenticated;

revoke all on function public.submit_manual_market_quote(
  uuid, numeric, character, timestamptz
) from public, anon, authenticated;
grant execute on function public.submit_manual_market_quote(
  uuid, numeric, character, timestamptz
) to authenticated;

revoke all on function public.upsert_fx_rate(
  text, date, numeric, timestamptz, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.upsert_fx_rate(
  text, date, numeric, timestamptz, timestamptz, text
) to service_role;
