create or replace function public.commit_gpw_monitoring_import_item(
  p_item_id uuid,
  p_price_level_actions jsonb default '[]'::jsonb
)
returns table (
  outcome text,
  monitoring_result_id uuid,
  stock_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.monitoring_import_items%rowtype;
  v_batch public.monitoring_import_batches%rowtype;
  v_company jsonb;
  v_stock_id uuid;
  v_status_id uuid;
  v_monitoring_id uuid;
  v_existing_monitoring_id uuid;
  v_latest_monitoring_id uuid;
  v_market_id uuid;
  v_action jsonb;
  v_tranche jsonb;
  v_action_name text;
  v_tranche_number integer;
  v_trigger_price numeric;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if jsonb_typeof(p_price_level_actions) <> 'array' then
    raise exception using errcode = '22023', message = 'price-level actions must be an array';
  end if;

  select * into v_item
  from public.monitoring_import_items
  where id = p_item_id and user_id = v_user_id
  for update;
  if not found then
    return query select 'invalid_item'::text, null::uuid, null::uuid;
    return;
  end if;

  select * into v_batch
  from public.monitoring_import_batches
  where id = v_item.batch_id and user_id = v_user_id
  for update;
  v_company := v_item.normalized_payload;

  if v_item.state = 'COMMITTED' then
    return query select 'already_committed'::text, v_item.committed_monitoring_result_id, v_item.resolved_stock_id;
    return;
  end if;
  if v_item.state not in ('READY', 'WARNING') or not v_item.include_in_commit
    or (v_item.state = 'WARNING' and not v_item.warnings_accepted) then
    return query select 'not_committable'::text, null::uuid, v_item.resolved_stock_id;
    return;
  end if;

  select id into v_existing_monitoring_id
  from public.monitoring_results
  where user_id = v_user_id
    and source_type = 'json_import'
    and source_reference = v_item.external_id;
  if v_existing_monitoring_id is not null then
    update public.monitoring_import_items
    set state = 'ALREADY_IMPORTED', include_in_commit = false,
        committed_monitoring_result_id = v_existing_monitoring_id,
        committed_at = coalesce(committed_at, now())
    where id = v_item.id;
    return query select 'already_imported'::text, v_existing_monitoring_id, v_item.resolved_stock_id;
    return;
  end if;

  select id into v_status_id
  from public.status_definitions
  where user_id = v_user_id
    and slug = v_company #>> '{classification,status}'
    and is_active;
  if v_status_id is null then
    return query select 'invalid_status'::text, null::uuid, v_item.resolved_stock_id;
    return;
  end if;

  select id into v_market_id from public.markets where code = 'GPW';
  select id into v_stock_id
  from public.stocks
  where market_id = v_market_id
    and ticker = v_company #>> '{identity,ticker}'
  for update;

  if v_stock_id is null then
    insert into public.stocks (market_id, ticker, name, exchange, currency, isin, data_mode)
    values (
      v_market_id,
      v_company #>> '{identity,ticker}',
      v_company #>> '{identity,name}',
      'XWAR',
      v_company #>> '{identity,currency}',
      nullif(v_company #>> '{identity,isin}', ''),
      'manual'
    )
    returning id into v_stock_id;
  end if;

  insert into public.watchlist_items (user_id, stock_id, current_status_id)
  values (v_user_id, v_stock_id, v_status_id)
  on conflict on constraint watchlist_items_user_id_stock_id_key do update
  set current_status_id = excluded.current_status_id,
      archived_at = null;

  select id into v_latest_monitoring_id
  from public.monitoring_results as monitoring
  where monitoring.user_id = v_user_id
    and monitoring.stock_id = v_stock_id
    and monitoring.deleted_at is null
  order by monitoring.analyzed_at desc, monitoring.created_at desc
  limit 1;

  insert into public.monitoring_results (
    user_id, stock_id, status_definition_id, analyzed_at, analysis_date,
    investment_score, recommendation, summary, pros, risks,
    price, currency, price_as_of, source_type, source_reference,
    decision_action, decision_reason, opportunity_category, analysis_details,
    base_fair_value, entry_zone_from, entry_zone_to, entry_zone_currency,
    base_total_return_pct, base_annualized_return_pct, bear_downside_pct,
    asymmetry_ratio, data_confidence, next_review_date, next_expected_report_date
  ) values (
    v_user_id, v_stock_id, v_status_id, v_batch.generated_at, v_batch.analysis_date,
    nullif(v_company #>> '{score,total}', '')::smallint,
    v_company #>> '{decision,action}',
    coalesce(v_company #>> '{thesis,summary}', v_company #>> '{decision,reason}'),
    v_company #> '{thesis,pros}', v_company #> '{thesis,risks}',
    nullif(v_company #>> '{marketData,price}', '')::numeric,
    v_company #>> '{marketData,currency}',
    nullif(v_company #>> '{marketData,asOf}', '')::timestamptz,
    'json_import', v_item.external_id,
    v_company #>> '{decision,action}', v_company #>> '{decision,reason}',
    v_company #>> '{classification,opportunityCategory}', v_company,
    nullif(v_company #>> '{valuation,fairValueBase}', '')::numeric,
    nullif(v_company #>> '{valuation,attractiveEntryZone,from}', '')::numeric,
    nullif(v_company #>> '{valuation,attractiveEntryZone,to}', '')::numeric,
    v_company #>> '{valuation,attractiveEntryZone,currency}',
    nullif(v_company #>> '{expectedReturn,baseTotalReturnPct}', '')::numeric,
    nullif(v_company #>> '{expectedReturn,baseAnnualizedReturnPct}', '')::numeric,
    nullif(v_company #>> '{expectedReturn,bearDownsidePct}', '')::numeric,
    nullif(v_company #>> '{expectedReturn,asymmetryRatio}', '')::numeric,
    v_company #>> '{dataQuality,confidence}',
    nullif(v_company #>> '{monitoringPlan,nextReviewDate}', '')::date,
    nullif(v_company #>> '{monitoringPlan,nextExpectedReportDate}', '')::date
  ) returning id into v_monitoring_id;

  insert into public.investment_theses (
    stock_id, monitoring_result_id, summary, catalysts, key_risks, kill_criteria,
    growth_drivers, eps_fcf_growth_drivers, pros
  ) values (
    v_stock_id, v_monitoring_id, v_company #>> '{thesis,summary}',
    v_company #> '{thesis,catalysts}', v_company #> '{thesis,risks}',
    v_company #> '{thesis,killCriteria}', v_company #> '{thesis,growthDrivers}',
    v_company #> '{thesis,epsFcfGrowthDrivers}', v_company #> '{thesis,pros}'
  );

  for v_action in select value from jsonb_array_elements(p_price_level_actions)
  loop
    v_action_name := v_action ->> 'action';
    v_tranche_number := nullif(v_action ->> 'trancheNumber', '')::integer;
    if v_action_name not in ('KEEP', 'ADD', 'SUPERSEDE') or v_tranche_number is null then
      raise exception using errcode = '22023', message = 'invalid price-level action';
    end if;
    if v_action_name = 'KEEP' then continue; end if;

    select value into v_tranche
    from jsonb_array_elements(v_company #> '{positionPlan,tranches}')
    where (value ->> 'number')::integer = v_tranche_number;
    v_trigger_price := nullif(v_tranche ->> 'triggerPrice', '')::numeric;
    if v_trigger_price is null then
      raise exception using errcode = '22023', message = 'event-only tranche cannot create a price level';
    end if;

    if v_action_name = 'SUPERSEDE' then
      update public.price_levels as level
      set is_active = false, valid_to = now()
      where level.user_id = v_user_id and level.stock_id = v_stock_id and level.is_active
        and level.label = format('Tranche %s', v_tranche_number);
    end if;
    insert into public.price_levels (
      user_id, stock_id, label, kind, value, currency, trigger_direction,
      priority, note, valid_from
    ) values (
      v_user_id, v_stock_id, format('Tranche %s', v_tranche_number), 'buy',
      v_trigger_price, v_tranche ->> 'currency', 'lte', v_tranche_number,
      v_tranche ->> 'condition', now()
    );
  end loop;

  update public.monitoring_import_items
  set state = 'COMMITTED', resolved_stock_id = v_stock_id,
      resolved_status_id = v_status_id, price_level_actions = p_price_level_actions,
      committed_monitoring_result_id = v_monitoring_id, committed_at = now()
  where id = v_item.id;

  update public.monitoring_import_batches as batch
  set state = case
    when exists (
      select 1 from public.monitoring_import_items as item
      where item.batch_id = batch.id and item.id <> v_item.id
        and item.state in ('READY', 'WARNING') and item.include_in_commit
    ) then 'partially_committed'
    else 'committed'
  end
  where batch.id = v_batch.id;

  insert into public.audit_events (user_id, entity_type, entity_id, action, after)
  values (v_user_id, 'monitoring_import_items', v_item.id, 'committed', jsonb_build_object(
    'monitoringResultId', v_monitoring_id,
    'stockId', v_stock_id,
    'previousMonitoringId', v_latest_monitoring_id
  ));

  return query select 'committed'::text, v_monitoring_id, v_stock_id;
end;
$$;
