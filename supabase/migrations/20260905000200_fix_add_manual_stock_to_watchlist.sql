create or replace function public.add_manual_stock_to_watchlist(
  p_market_code text,
  p_ticker text,
  p_name text,
  p_status_id uuid
)
returns table (
  outcome text,
  stock_id uuid,
  watchlist_item_id uuid
)
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_market public.markets%rowtype;
  v_stock_id uuid;
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
    select 1
    from public.status_definitions as sd
    where sd.id = p_status_id
      and sd.user_id = v_user_id
      and sd.is_active
  ) then
    return query select 'invalid_status'::text, null::uuid, null::uuid;
    return;
  end if;

  if btrim(p_ticker) = '' or btrim(p_name) = '' then
    raise exception using errcode = '22023', message = 'ticker and name are required';
  end if;

  insert into public.stocks (
    market_id,
    ticker,
    name,
    exchange,
    currency,
    data_mode
  )
  values (
    v_market.id,
    btrim(p_ticker),
    btrim(p_name),
    v_market.name,
    v_market.currency,
    'manual'
  )
  on conflict on constraint stocks_market_id_ticker_key do nothing
  returning id into v_stock_id;

  if v_stock_id is null then
    select s.id into v_stock_id
    from public.stocks as s
    where s.market_id = v_market.id
      and s.ticker = btrim(p_ticker);
  end if;

  if v_stock_id is null then
    return query select 'conflict'::text, null::uuid, null::uuid;
    return;
  end if;

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

  begin
    insert into public.watchlist_items (user_id, stock_id, current_status_id)
    values (v_user_id, v_stock_id, p_status_id)
    returning id into v_watchlist_item_id;
  exception
    when unique_violation then
      select wi.id, wi.archived_at
      into v_watchlist_item_id, v_archived_at
      from public.watchlist_items as wi
      where wi.user_id = v_user_id
        and wi.stock_id = v_stock_id
      for update;

      if v_watchlist_item_id is null then
        return query select 'conflict'::text, v_stock_id, null::uuid;
        return;
      end if;

      if v_archived_at is not null then
        update public.watchlist_items as wi
        set archived_at = null,
            current_status_id = p_status_id
        where wi.id = v_watchlist_item_id;

        return query select 'restored'::text, v_stock_id, v_watchlist_item_id;
        return;
      end if;

      return query select 'already_active'::text, v_stock_id, v_watchlist_item_id;
      return;
  end;

  return query select 'created'::text, v_stock_id, v_watchlist_item_id;
end;
$$;
