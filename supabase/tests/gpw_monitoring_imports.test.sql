begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '16000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'imports-owner@example.com',
  extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

select public.initialize_default_statuses('16000000-0000-4000-8000-000000000001');

create function pg_temp.company_payload(
  p_external_id text,
  p_ticker text,
  p_status text,
  p_price numeric
) returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'externalId', p_external_id,
    'identity', jsonb_build_object(
      'ticker', p_ticker, 'name', p_ticker || ' Company', 'market', 'GPW',
      'currency', 'PLN', 'isin', null
    ),
    'decision', jsonb_build_object(
      'action', case when p_status = 'BUY_CANDIDATE' then 'BUY_GRADUALLY' else 'WATCH' end,
      'reason', 'Test decision', 'watchReason', null
    ),
    'classification', jsonb_build_object(
      'status', p_status, 'opportunityCategory', 'QUALITY_COMPOUNDER'
    ),
    'score', jsonb_build_object('total', 80, 'components', jsonb_build_object()),
    'marketData', jsonb_build_object(
      'price', p_price, 'currency', 'PLN', 'asOf', '2026-09-16T15:00:00Z', 'source', 'fixture'
    ),
    'valuation', jsonb_build_object(
      'fairValueBase', 130, 'attractiveEntryZone', jsonb_build_object('from', 90, 'to', 100, 'currency', 'PLN')
    ),
    'expectedReturn', jsonb_build_object(
      'baseTotalReturnPct', 30, 'baseAnnualizedReturnPct', 9.14,
      'bearDownsidePct', -15, 'asymmetryRatio', 2
    ),
    'thesis', jsonb_build_object(
      'summary', 'Immutable thesis', 'growthDrivers', jsonb_build_array('Growth'),
      'epsFcfGrowthDrivers', jsonb_build_array('FCF'), 'catalysts', jsonb_build_array('Results'),
      'pros', jsonb_build_array('Quality'), 'risks', jsonb_build_array('Valuation'),
      'killCriteria', jsonb_build_array(jsonb_build_object(
        'condition', 'Margin fails', 'metricOrEvent', 'EBIT margin',
        'threshold', 'below 5%', 'reviewSource', 'Periodic report'
      ))
    ),
    'positionPlan', jsonb_build_object(
      'tranches', jsonb_build_array(jsonb_build_object(
        'number', 1, 'triggerPrice', 95, 'currency', 'PLN',
        'condition', 'Inside entry zone', 'sizeGuidance', 'SMALL_INITIAL'
      ))
    ),
    'monitoringPlan', jsonb_build_object(
      'nextReviewDate', '2026-12-01', 'nextExpectedReportDate', '2026-11-15'
    ),
    'dataQuality', jsonb_build_object('confidence', 'HIGH')
  )
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '16000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$select * from public.create_gpw_monitoring_import_draft(
    'gpw-scan-2026-09-01', '2026-09-01T18:00:00Z', '2026-09-01', 'scan-1.json',
    '{"schemaVersion":"1.0","exportType":"gpw_opportunity_monitoring"}'::jsonb, 80,
    jsonb_build_array(jsonb_build_object(
      'externalId', 'gpw-APT-2026-09-01', 'ordinal', 0, 'ticker', 'APT',
      'companyName', 'APT Company', 'decisionAction', 'WATCH',
      'importedStatusSlug', 'WATCH', 'confidence', 'HIGH', 'state', 'READY',
      'includeInCommit', true, 'warningsAccepted', false,
      'warnings', '[]'::jsonb, 'errors', '[]'::jsonb,
      'normalizedPayload', pg_temp.company_payload('gpw-APT-2026-09-01', 'APT', 'WATCH', 20)
    ))
  )$$,
  'valid file creates an import draft'
);

select is(
  (select state from public.monitoring_import_items where external_id = 'gpw-APT-2026-09-01'),
  'READY',
  'draft item is ready before commit'
);

select is(
  (select outcome from public.commit_gpw_monitoring_import_item(
    (select id from public.monitoring_import_items where external_id = 'gpw-APT-2026-09-01'),
    '[{"trancheNumber":1,"action":"ADD"}]'::jsonb
  )),
  'committed',
  'single item commits atomically'
);

select is((select count(*)::integer from public.stocks where ticker = 'APT'), 1, 'new stock is created');
select is((select count(*)::integer from public.watchlist_items where user_id = auth.uid()), 1, 'new stock is added to watchlist');
select is((select count(*)::integer from public.monitoring_results where source_reference = 'gpw-APT-2026-09-01'), 1, 'monitoring snapshot is created');
select is((select count(*)::integer from public.investment_theses), 1, 'thesis revision is created');
select is((select count(*)::integer from public.price_levels where label = 'Tranche 1' and is_active), 1, 'explicit ADD creates a price level');

select lives_ok(
  $$select * from public.create_gpw_monitoring_import_draft(
    'gpw-scan-2026-09-16', '2026-09-16T18:00:00Z', '2026-09-16', 'scan-2.json',
    '{"schemaVersion":"1.0","exportType":"gpw_opportunity_monitoring"}'::jsonb, 80,
    jsonb_build_array(jsonb_build_object(
      'externalId', 'gpw-APT-2026-09-16', 'ordinal', 0, 'ticker', 'APT',
      'companyName', 'APT Company', 'decisionAction', 'BUY_GRADUALLY',
      'importedStatusSlug', 'BUY_CANDIDATE', 'confidence', 'HIGH', 'state', 'READY',
      'includeInCommit', true, 'warningsAccepted', false,
      'warnings', '[]'::jsonb, 'errors', '[]'::jsonb,
      'normalizedPayload', pg_temp.company_payload('gpw-APT-2026-09-16', 'APT', 'BUY_CANDIDATE', 22)
    ))
  )$$,
  'second analysis of an existing stock creates another draft'
);

select is(
  (select outcome from public.commit_gpw_monitoring_import_item(
    (select id from public.monitoring_import_items where external_id = 'gpw-APT-2026-09-16'), '[]'::jsonb
  )),
  'committed',
  'second analysis commits'
);

select is((select count(*)::integer from public.monitoring_results where stock_id = (select id from public.stocks where ticker = 'APT')), 2, 'two imports create two immutable monitoring results');
select is((select price from public.monitoring_results where source_reference = 'gpw-APT-2026-09-01'), 20::numeric, 'first historical analysis price remains unchanged');

reset role;
insert into public.market_quotes (
  stock_id, price, currency, as_of, provider, quality_status
) values (
  (select id from public.stocks where ticker = 'APT'), 25, 'PLN', '2026-09-17T15:00:00Z', 'Manual', 'fresh'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '16000000-0000-4000-8000-000000000001', true);
select is((select price from public.market_quotes where stock_id = (select id from public.stocks where ticker = 'APT')), 25::numeric, 'current quote can change independently');
select is((select price from public.monitoring_results where source_reference = 'gpw-APT-2026-09-01'), 20::numeric, 'current quote does not mutate historical price');

select is(
  (select outcome from public.commit_gpw_monitoring_import_item(
    (select id from public.monitoring_import_items where external_id = 'gpw-APT-2026-09-16'), '[]'::jsonb
  )),
  'already_committed',
  'repeated commit is idempotent'
);
select is((select count(*)::integer from public.monitoring_results where source_reference = 'gpw-APT-2026-09-16'), 1, 'idempotent commit creates one monitoring result');

do $test_completion$
declare
  failure_report text;
begin
  select string_agg(result, E'\n') into failure_report from finish() as result;
  if failure_report is not null then raise exception '%', failure_report; end if;
end;
$test_completion$;

rollback;
