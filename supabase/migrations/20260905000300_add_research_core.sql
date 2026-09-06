create or replace function public.enforce_price_level_stock_currency()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_currency character(3);
begin
  select s.currency into v_currency
  from public.stocks as s
  where s.id = new.stock_id;

  if not found then
    raise exception using errcode = '23503', message = 'stock not found';
  end if;

  if new.currency <> v_currency then
    raise exception using errcode = '23514', message = 'price level currency must match stock currency';
  end if;

  return new;
end;
$$;

create trigger price_levels_enforce_stock_currency
before insert or update of stock_id, currency on public.price_levels
for each row execute function public.enforce_price_level_stock_currency();

drop policy price_levels_owner_insert on public.price_levels;
drop policy price_levels_owner_update on public.price_levels;

create policy price_levels_owner_insert
on public.price_levels for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_items as wi
    where wi.user_id = (select auth.uid())
      and wi.stock_id = price_levels.stock_id
  )
);

create policy price_levels_owner_update
on public.price_levels for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_items as wi
    where wi.user_id = (select auth.uid())
      and wi.stock_id = price_levels.stock_id
  )
);

drop policy notes_owner_insert on public.notes;
drop policy notes_owner_update on public.notes;

create policy notes_owner_insert
on public.notes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_items as wi
    where wi.user_id = (select auth.uid())
      and wi.stock_id = notes.stock_id
  )
);

create policy notes_owner_update
on public.notes for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.watchlist_items as wi
    where wi.user_id = (select auth.uid())
      and wi.stock_id = notes.stock_id
  )
);

create or replace function public.audit_research_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text;
begin
  if tg_table_name = 'price_levels' then
    v_action := case
      when old.is_active and not new.is_active then 'deactivated'
      else 'updated'
    end;
  elsif tg_table_name = 'notes'
    and old.deleted_at is null
    and new.deleted_at is not null then
    v_action := 'archived';
  else
    return new;
  end if;

  insert into public.audit_events (user_id, entity_type, entity_id, action, before, after)
  values (new.user_id, tg_table_name, new.id, v_action, to_jsonb(old), to_jsonb(new));

  return new;
end;
$$;

create trigger price_levels_audit_update
after update on public.price_levels
for each row execute function public.audit_research_mutation();

create trigger notes_audit_archive
after update of deleted_at on public.notes
for each row execute function public.audit_research_mutation();

create or replace function public.create_monitoring_with_thesis(
  p_stock_id uuid,
  p_status_definition_id uuid,
  p_analyzed_at timestamptz,
  p_investment_score smallint,
  p_quality_score smallint,
  p_valuation_score smallint,
  p_momentum_score smallint,
  p_risk_score smallint,
  p_recommendation text,
  p_summary text,
  p_pros jsonb,
  p_risks jsonb,
  p_price numeric,
  p_currency character(3),
  p_price_as_of timestamptz,
  p_fx_usd_pln numeric,
  p_source_reference text,
  p_supersedes_id uuid,
  p_thesis_summary text,
  p_bull_case text,
  p_base_case text,
  p_bear_case text,
  p_catalysts jsonb,
  p_key_risks jsonb,
  p_kill_criteria jsonb
)
returns table (
  outcome text,
  monitoring_result_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_stock_currency character(3);
  v_monitoring_id uuid;
  v_has_thesis boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select s.currency into v_stock_currency
  from public.watchlist_items as wi
  join public.stocks as s on s.id = wi.stock_id
  where wi.user_id = v_user_id
    and wi.stock_id = p_stock_id
  for update of wi;

  if not found then
    return query select 'invalid_stock'::text, null::uuid;
    return;
  end if;

  if not exists (
    select 1
    from public.status_definitions as sd
    where sd.id = p_status_definition_id
      and sd.user_id = v_user_id
      and sd.is_active
  ) then
    return query select 'invalid_status'::text, null::uuid;
    return;
  end if;

  if p_currency <> v_stock_currency then
    return query select 'invalid_currency'::text, null::uuid;
    return;
  end if;

  if v_stock_currency <> 'USD' and p_fx_usd_pln is not null then
    return query select 'invalid_fx'::text, null::uuid;
    return;
  end if;

  if p_supersedes_id is not null and not exists (
    select 1
    from public.monitoring_results as mr
    where mr.id = p_supersedes_id
      and mr.user_id = v_user_id
      and mr.stock_id = p_stock_id
  ) then
    return query select 'invalid_supersedes'::text, null::uuid;
    return;
  end if;

  insert into public.monitoring_results (
    user_id,
    stock_id,
    status_definition_id,
    analyzed_at,
    investment_score,
    quality_score,
    valuation_score,
    momentum_score,
    risk_score,
    recommendation,
    summary,
    pros,
    risks,
    price,
    currency,
    price_as_of,
    fx_usd_pln,
    price_pln,
    source_type,
    source_reference,
    supersedes_id
  ) values (
    v_user_id,
    p_stock_id,
    p_status_definition_id,
    p_analyzed_at,
    p_investment_score,
    p_quality_score,
    p_valuation_score,
    p_momentum_score,
    p_risk_score,
    nullif(btrim(p_recommendation), ''),
    nullif(btrim(p_summary), ''),
    coalesce(p_pros, '[]'::jsonb),
    coalesce(p_risks, '[]'::jsonb),
    p_price,
    p_currency,
    p_price_as_of,
    p_fx_usd_pln,
    case when p_fx_usd_pln is null then null else p_price * p_fx_usd_pln end,
    'manual',
    nullif(btrim(p_source_reference), ''),
    p_supersedes_id
  )
  returning id into v_monitoring_id;

  v_has_thesis :=
    nullif(btrim(p_thesis_summary), '') is not null
    or nullif(btrim(p_bull_case), '') is not null
    or nullif(btrim(p_base_case), '') is not null
    or nullif(btrim(p_bear_case), '') is not null
    or jsonb_array_length(coalesce(p_catalysts, '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(p_key_risks, '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(p_kill_criteria, '[]'::jsonb)) > 0;

  if v_has_thesis then
    insert into public.investment_theses (
      stock_id,
      monitoring_result_id,
      summary,
      bull_case,
      base_case,
      bear_case,
      catalysts,
      key_risks,
      kill_criteria
    ) values (
      p_stock_id,
      v_monitoring_id,
      nullif(btrim(p_thesis_summary), ''),
      nullif(btrim(p_bull_case), ''),
      nullif(btrim(p_base_case), ''),
      nullif(btrim(p_bear_case), ''),
      coalesce(p_catalysts, '[]'::jsonb),
      coalesce(p_key_risks, '[]'::jsonb),
      coalesce(p_kill_criteria, '[]'::jsonb)
    );
  end if;

  update public.watchlist_items as wi
  set current_status_id = p_status_definition_id
  where wi.user_id = v_user_id
    and wi.stock_id = p_stock_id;

  if not found then
    raise exception using errcode = '40001', message = 'watchlist status update failed';
  end if;

  return query select 'created'::text, v_monitoring_id;
end;
$$;

revoke all on function public.enforce_price_level_stock_currency()
  from public, anon, authenticated;
revoke all on function public.audit_research_mutation()
  from public, anon, authenticated;
revoke all on function public.create_monitoring_with_thesis(
  uuid, uuid, timestamptz, smallint, smallint, smallint, smallint, smallint,
  text, text, jsonb, jsonb, numeric, character, timestamptz, numeric, text, uuid,
  text, text, text, text, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.create_monitoring_with_thesis(
  uuid, uuid, timestamptz, smallint, smallint, smallint, smallint, smallint,
  text, text, jsonb, jsonb, numeric, character, timestamptz, numeric, text, uuid,
  text, text, text, text, jsonb, jsonb, jsonb
) to authenticated;
