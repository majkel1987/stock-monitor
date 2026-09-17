alter table public.monitoring_results
  alter column price drop not null,
  alter column price_as_of drop not null,
  add column analysis_date date,
  add column decision_action text,
  add column decision_reason text,
  add column opportunity_category text,
  add column analysis_details jsonb not null default '{}'::jsonb,
  add column base_fair_value numeric(20, 6),
  add column entry_zone_from numeric(20, 6),
  add column entry_zone_to numeric(20, 6),
  add column entry_zone_currency character(3),
  add column base_total_return_pct numeric(12, 6),
  add column base_annualized_return_pct numeric(12, 6),
  add column bear_downside_pct numeric(12, 6),
  add column asymmetry_ratio numeric(12, 6),
  add column data_confidence text,
  add column next_review_date date,
  add column next_expected_report_date date;

alter table public.monitoring_results
  drop constraint monitoring_results_price_check,
  add constraint monitoring_results_price_check check (price is null or price > 0),
  add constraint monitoring_results_price_snapshot_check check (
    (price is null and price_as_of is null)
    or (price is not null and price_as_of is not null)
  ),
  add constraint monitoring_results_decision_action_check check (
    decision_action is null
    or decision_action in ('BUY_GRADUALLY', 'WATCH', 'HOLD', 'REDUCE', 'AVOID')
  ),
  add constraint monitoring_results_analysis_details_check check (
    jsonb_typeof(analysis_details) = 'object'
    and octet_length(analysis_details::text) <= 500000
  ),
  add constraint monitoring_results_fair_value_check check (
    base_fair_value is null or base_fair_value >= 0
  ),
  add constraint monitoring_results_entry_zone_check check (
    (entry_zone_from is null or entry_zone_from >= 0)
    and (entry_zone_to is null or entry_zone_to >= 0)
    and (entry_zone_from is null or entry_zone_to is null or entry_zone_from <= entry_zone_to)
  ),
  add constraint monitoring_results_entry_zone_currency_check check (
    entry_zone_currency is null or entry_zone_currency ~ '^[A-Z]{3}$'
  ),
  add constraint monitoring_results_asymmetry_check check (
    asymmetry_ratio is null or asymmetry_ratio >= 0
  ),
  add constraint monitoring_results_data_confidence_check check (
    data_confidence is null or data_confidence in ('HIGH', 'MEDIUM', 'LOW')
  );

create unique index monitoring_results_json_import_external_id_key
  on public.monitoring_results (user_id, source_reference)
  where source_type = 'json_import' and source_reference is not null;

create index monitoring_results_import_sort_idx
  on public.monitoring_results (
    user_id,
    investment_score desc nulls last,
    base_total_return_pct desc nulls last,
    asymmetry_ratio desc nulls last,
    analyzed_at desc
  )
  where deleted_at is null;

alter table public.investment_theses
  add column growth_drivers jsonb not null default '[]'::jsonb,
  add column eps_fcf_growth_drivers jsonb not null default '[]'::jsonb,
  add column pros jsonb not null default '[]'::jsonb;

alter table public.investment_theses
  add constraint investment_theses_growth_drivers_check check (jsonb_typeof(growth_drivers) = 'array'),
  add constraint investment_theses_eps_fcf_growth_drivers_check check (jsonb_typeof(eps_fcf_growth_drivers) = 'array'),
  add constraint investment_theses_pros_check check (jsonb_typeof(pros) = 'array');

create table public.monitoring_import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  external_id text not null,
  schema_version text not null,
  export_type text not null,
  generated_at timestamptz not null,
  analysis_date date not null,
  file_name text not null,
  raw_payload jsonb not null,
  raw_size_bytes integer not null,
  state text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monitoring_import_batches_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint monitoring_import_batches_user_external_key unique (user_id, external_id),
  constraint monitoring_import_batches_external_id_check check (char_length(external_id) between 1 and 160),
  constraint monitoring_import_batches_schema_version_check check (schema_version = '1.0'),
  constraint monitoring_import_batches_export_type_check check (export_type = 'gpw_opportunity_monitoring'),
  constraint monitoring_import_batches_file_name_check check (char_length(file_name) between 1 and 255),
  constraint monitoring_import_batches_payload_check check (
    jsonb_typeof(raw_payload) = 'object'
    and raw_size_bytes between 2 and 1000000
    and octet_length(raw_payload::text) <= 1000000
  ),
  constraint monitoring_import_batches_state_check check (
    state in ('draft', 'partially_committed', 'committed')
  )
);

create table public.monitoring_import_items (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null,
  user_id uuid not null,
  external_id text not null,
  ordinal integer not null,
  ticker text,
  company_name text,
  decision_action text,
  imported_status_slug text,
  existing_status_slug text,
  confidence text,
  state text not null,
  include_in_commit boolean not null default true,
  warnings_accepted boolean not null default false,
  resolved_stock_id uuid,
  resolved_status_id uuid,
  current_price numeric(20, 6),
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  normalized_payload jsonb not null,
  price_level_actions jsonb not null default '[]'::jsonb,
  committed_monitoring_result_id uuid,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  constraint monitoring_import_items_batch_id_fkey foreign key (batch_id)
    references public.monitoring_import_batches (id) on delete restrict,
  constraint monitoring_import_items_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint monitoring_import_items_stock_id_fkey foreign key (resolved_stock_id)
    references public.stocks (id) on delete restrict,
  constraint monitoring_import_items_status_owner_fkey foreign key (resolved_status_id, user_id)
    references public.status_definitions (id, user_id) on delete restrict,
  constraint monitoring_import_items_monitoring_id_fkey foreign key (committed_monitoring_result_id)
    references public.monitoring_results (id) on delete restrict,
  constraint monitoring_import_items_batch_ordinal_key unique (batch_id, ordinal),
  constraint monitoring_import_items_batch_external_key unique (batch_id, external_id),
  constraint monitoring_import_items_external_id_check check (char_length(external_id) between 1 and 160),
  constraint monitoring_import_items_ordinal_check check (ordinal >= 0),
  constraint monitoring_import_items_state_check check (
    state in ('READY', 'WARNING', 'ERROR', 'ALREADY_IMPORTED', 'COMMITTED', 'EXCLUDED')
  ),
  constraint monitoring_import_items_confidence_check check (
    confidence is null or confidence in ('HIGH', 'MEDIUM', 'LOW')
  ),
  constraint monitoring_import_items_json_check check (
    jsonb_typeof(warnings) = 'array'
    and jsonb_typeof(errors) = 'array'
    and jsonb_typeof(normalized_payload) = 'object'
    and jsonb_typeof(price_level_actions) = 'array'
    and octet_length(normalized_payload::text) <= 500000
  ),
  constraint monitoring_import_items_commit_check check (
    (state = 'COMMITTED' and committed_monitoring_result_id is not null and committed_at is not null)
    or state <> 'COMMITTED'
  )
);

create index monitoring_import_batches_user_created_idx
  on public.monitoring_import_batches (user_id, created_at desc);
create index monitoring_import_items_batch_state_idx
  on public.monitoring_import_items (batch_id, state, ordinal);

create trigger monitoring_import_batches_set_updated_at
before update on public.monitoring_import_batches
for each row execute function public.set_updated_at();

create or replace function public.protect_monitoring_import_payloads()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_table_name = 'monitoring_import_batches' then
    if new.user_id <> old.user_id
      or new.external_id <> old.external_id
      or new.schema_version <> old.schema_version
      or new.export_type <> old.export_type
      or new.raw_payload <> old.raw_payload then
      raise exception using errcode = '55000', message = 'import batch payload is immutable';
    end if;
  elsif new.user_id <> old.user_id
    or new.batch_id <> old.batch_id
    or new.external_id <> old.external_id
    or new.normalized_payload <> old.normalized_payload then
    raise exception using errcode = '55000', message = 'import item payload is immutable';
  end if;
  return new;
end;
$$;

create trigger monitoring_import_batches_protect_payload
before update on public.monitoring_import_batches
for each row execute function public.protect_monitoring_import_payloads();

create trigger monitoring_import_items_protect_payload
before update on public.monitoring_import_items
for each row execute function public.protect_monitoring_import_payloads();

alter table public.monitoring_import_batches enable row level security;
alter table public.monitoring_import_items enable row level security;

create policy monitoring_import_batches_owner_all
on public.monitoring_import_batches for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy monitoring_import_items_owner_all
on public.monitoring_import_items for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.monitoring_import_batches as batch
    where batch.id = batch_id and batch.user_id = auth.uid()
  )
);

grant select, insert, update on public.monitoring_import_batches to authenticated;
grant select, insert, update on public.monitoring_import_items to authenticated;
revoke all on function public.protect_monitoring_import_payloads() from public, anon, authenticated;

create or replace function public.create_gpw_monitoring_import_draft(
  p_external_id text,
  p_generated_at timestamptz,
  p_analysis_date date,
  p_file_name text,
  p_raw_payload jsonb,
  p_raw_size_bytes integer,
  p_items jsonb
)
returns table (
  outcome text,
  batch_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch_id uuid;
  v_item jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = '22023', message = 'invalid import item collection';
  end if;

  select id into v_batch_id
  from public.monitoring_import_batches
  where user_id = v_user_id and external_id = p_external_id;
  if v_batch_id is not null then
    return query select 'already_exists'::text, v_batch_id;
    return;
  end if;

  insert into public.monitoring_import_batches (
    user_id, external_id, schema_version, export_type, generated_at,
    analysis_date, file_name, raw_payload, raw_size_bytes
  ) values (
    v_user_id, p_external_id, '1.0', 'gpw_opportunity_monitoring',
    p_generated_at, p_analysis_date, p_file_name, p_raw_payload, p_raw_size_bytes
  ) returning id into v_batch_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.monitoring_import_items (
      batch_id, user_id, external_id, ordinal, ticker, company_name,
      decision_action, imported_status_slug, existing_status_slug, confidence,
      state, include_in_commit, warnings_accepted, resolved_stock_id, resolved_status_id,
      current_price, warnings, errors, normalized_payload
    ) values (
      v_batch_id, v_user_id, v_item ->> 'externalId', (v_item ->> 'ordinal')::integer,
      v_item ->> 'ticker', v_item ->> 'companyName', v_item ->> 'decisionAction',
      v_item ->> 'importedStatusSlug', v_item ->> 'existingStatusSlug',
      v_item ->> 'confidence', v_item ->> 'state',
      coalesce((v_item ->> 'includeInCommit')::boolean, true),
      coalesce((v_item ->> 'warningsAccepted')::boolean, false),
      nullif(v_item ->> 'resolvedStockId', '')::uuid,
      nullif(v_item ->> 'resolvedStatusId', '')::uuid,
      nullif(v_item ->> 'currentPrice', '')::numeric,
      coalesce(v_item -> 'warnings', '[]'::jsonb),
      coalesce(v_item -> 'errors', '[]'::jsonb),
      v_item -> 'normalizedPayload'
    );
  end loop;

  return query select 'created'::text, v_batch_id;
end;
$$;

revoke all on function public.create_gpw_monitoring_import_draft(
  text, timestamptz, date, text, jsonb, integer, jsonb
) from public, anon;
grant execute on function public.create_gpw_monitoring_import_draft(
  text, timestamptz, date, text, jsonb, integer, jsonb
) to authenticated;

insert into public.status_definitions (
  user_id, slug, label, description, color_token, dashboard_group, sort_order
)
select id, 'REDUCE', 'Reduce', 'Reduce exposure because the risk/reward has deteriorated.', 'negative', 'negative', 70
from auth.users
on conflict (user_id, slug) do nothing;

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

revoke all on function public.commit_gpw_monitoring_import_item(uuid, jsonb) from public, anon;
grant execute on function public.commit_gpw_monitoring_import_item(uuid, jsonb) to authenticated;

create or replace function public.initialize_default_statuses(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  inserted_count integer;
begin
  if p_user_id is null then raise exception using errcode = '22004', message = 'a Supabase Auth user id is required'; end if;
  if auth.uid() is not null and auth.uid() <> p_user_id then raise exception using errcode = '42501', message = 'statuses can only be initialized for the current user'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception using errcode = '23503', message = 'the Supabase Auth user does not exist'; end if;

  insert into public.status_definitions (
    user_id, slug, label, description, color_token, dashboard_group, sort_order
  ) values
    (p_user_id, 'BUY_CANDIDATE', 'Buy Candidate', 'Attractive on fundamentals and price.', 'positive', 'opportunity', 10),
    (p_user_id, 'WATCH', 'Watch', 'Good company without the required margin of safety.', 'info', 'watch', 20),
    (p_user_id, 'WAIT_FOR_CORRECTION', 'Wait for Correction', 'Waiting for a lower entry price.', 'warning', 'watch', 30),
    (p_user_id, 'DEEP_DIVE', 'Deep Dive', 'Requires a complete investment analysis.', 'accent', 'research', 40),
    (p_user_id, 'PORTFOLIO', 'Portfolio', 'Currently held in the portfolio.', 'portfolio', 'portfolio', 50),
    (p_user_id, 'HOLD', 'Hold', 'Position does not currently require an increase.', 'neutral', 'portfolio', 60),
    (p_user_id, 'REDUCE', 'Reduce', 'Reduce exposure because the risk/reward has deteriorated.', 'negative', 'negative', 70),
    (p_user_id, 'AVOID', 'Avoid', 'Does not currently satisfy the investment criteria.', 'negative', 'negative', 80),
    (p_user_id, 'KILL_THE_THESIS', 'Kill the Thesis', 'The investment thesis has been invalidated.', 'danger', 'negative', 90)
  on conflict (user_id, slug) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
