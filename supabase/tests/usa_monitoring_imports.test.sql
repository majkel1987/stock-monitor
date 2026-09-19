begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '19000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'usa-imports-owner@example.com',
  extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

select public.initialize_default_statuses('19000000-0000-4000-8000-000000000001');

create function pg_temp.usa_company_payload(
  p_external_id text,
  p_price numeric
) returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'externalId', p_external_id,
    'identity', jsonb_build_object(
      'ticker', 'EME', 'name', 'EMCOR Group, Inc.', 'legalName', 'EMCOR Group, Inc.',
      'market', 'USA', 'exchange', 'NYSE', 'currency', 'USD',
      'cik', '0000105634', 'isin', null
    ),
    'decision', jsonb_build_object(
      'action', 'WATCH', 'reason', 'Test decision', 'watchReason', 'Wait for price'
    ),
    'classification', jsonb_build_object(
      'status', 'WATCH', 'opportunityCategory', 'QUALITY_COMPOUNDER'
    ),
    'score', jsonb_build_object('total', 72, 'components', jsonb_build_object()),
    'marketData', jsonb_build_object(
      'price', p_price, 'currency', 'USD',
      'asOf', '2026-09-18T23:15:00Z', 'source', 'fixture'
    ),
    'valuation', jsonb_build_object(
      'fairValueBase', 985,
      'attractiveEntryZone', jsonb_build_object('from', 570, 'to', 610, 'currency', 'USD'),
      'entryZones', jsonb_build_object(
        'starter', jsonb_build_object('from', 640, 'to', 680, 'currency', 'USD')
      ),
      'reverseDcf', jsonb_build_object('impliedFcfCagrPct', 13.62)
    ),
    'scenarios', jsonb_build_object(
      'base', jsonb_build_object('fairValue', 985, 'currency', 'USD')
    ),
    'expectedReturn', jsonb_build_object(
      'baseTotalReturnPct', 32.25, 'baseAnnualizedReturnPct', 7.24,
      'bearDownsidePct', -17.74, 'asymmetryRatio', 1.82
    ),
    'thesis', jsonb_build_object(
      'summary', 'USA thesis', 'growthDrivers', jsonb_build_array('Backlog'),
      'epsFcfGrowthDrivers', jsonb_build_array('FCF'),
      'catalysts', jsonb_build_array('Results'),
      'pros', jsonb_build_array('Quality'), 'risks', jsonb_build_array('Valuation'),
      'killCriteria', jsonb_build_array(jsonb_build_object(
        'condition', 'Backlog quality falls', 'metricOrEvent', 'RPO',
        'threshold', 'down 10%', 'reviewSource', '10-Q'
      ))
    ),
    'positionPlan', jsonb_build_object(
      'tranches', jsonb_build_array(jsonb_build_object(
        'number', 1, 'triggerPrice', 670, 'currency', 'USD',
        'condition', 'Guidance intact', 'sizeGuidance', 'SMALL_INITIAL'
      ))
    ),
    'monitoringPlan', jsonb_build_object(
      'nextReviewDate', '2026-11-01', 'nextExpectedReportDate', '2026-10-29'
    ),
    'sources', jsonb_build_array(jsonb_build_object('type', 'SEC_10_Q')),
    'dataQuality', jsonb_build_object('confidence', 'MEDIUM')
  )
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '19000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$select * from public.create_usa_monitoring_import_draft(
    'usa-scan-2026-09-19', '2026-09-19T10:01:23Z', '2026-09-19', 'usa.json',
    '{"schemaVersion":"1.0","exportType":"usa_opportunity_monitoring","market":"USA"}'::jsonb,
    100,
    jsonb_build_array(jsonb_build_object(
      'externalId', 'usa-EME-2026-09-19', 'ordinal', 0, 'ticker', 'EME',
      'companyName', 'EMCOR Group, Inc.', 'decisionAction', 'WATCH',
      'importedStatusSlug', 'WATCH', 'confidence', 'MEDIUM', 'state', 'READY',
      'includeInCommit', true, 'warningsAccepted', false,
      'warnings', '[]'::jsonb, 'errors', '[]'::jsonb,
      'normalizedPayload', pg_temp.usa_company_payload('usa-EME-2026-09-19', 750.09)
    ))
  )$$,
  'USA file creates an import draft'
);

select is(
  (select export_type from public.monitoring_import_batches where external_id = 'usa-scan-2026-09-19'),
  'usa_opportunity_monitoring',
  'USA batch keeps its export type'
);

select is(
  (select outcome from public.commit_usa_monitoring_import_item(
    (select id from public.monitoring_import_items where external_id = 'usa-EME-2026-09-19'),
    '[{"trancheNumber":1,"action":"ADD"}]'::jsonb
  )),
  'committed',
  'USA item commits atomically'
);

select is((select count(*)::integer from public.stocks where ticker = 'EME'), 1, 'USA stock is created once');
select is((select exchange from public.stocks where ticker = 'EME'), 'NYSE', 'NYSE exchange is preserved');
select is((select currency::text from public.stocks where ticker = 'EME'), 'USD', 'stock currency remains USD');
select is((select price from public.monitoring_results where source_reference = 'usa-EME-2026-09-19'), 750.09::numeric, 'analysis price is stored in USD');
select is((select analysis_details #>> '{identity,cik}' from public.monitoring_results where source_reference = 'usa-EME-2026-09-19'), '0000105634', 'CIK remains in the complete analysis snapshot');
select is((select analysis_details #>> '{thesis,killCriteria,0,metricOrEvent}' from public.monitoring_results where source_reference = 'usa-EME-2026-09-19'), 'RPO', 'kill criterion remains available in analysis details');

select is(
  (select outcome from public.commit_usa_monitoring_import_item(
    (select id from public.monitoring_import_items where external_id = 'usa-EME-2026-09-19'),
    '[]'::jsonb
  )),
  'already_committed',
  'repeated USA commit is idempotent'
);

select lives_ok(
  $$select * from public.create_usa_monitoring_import_draft(
    'usa-scan-2026-12-19', '2026-12-19T10:01:23Z', '2026-12-19', 'usa-later.json',
    '{"schemaVersion":"1.0","exportType":"usa_opportunity_monitoring","market":"USA"}'::jsonb,
    100,
    jsonb_build_array(jsonb_build_object(
      'externalId', 'usa-EME-2026-12-19', 'ordinal', 0, 'ticker', 'EME',
      'companyName', 'EMCOR Group, Inc.', 'decisionAction', 'WATCH',
      'importedStatusSlug', 'WATCH', 'confidence', 'MEDIUM', 'state', 'READY',
      'includeInCommit', true, 'warningsAccepted', false,
      'warnings', '[]'::jsonb, 'errors', '[]'::jsonb,
      'normalizedPayload', pg_temp.usa_company_payload('usa-EME-2026-12-19', 760)
    ))
  )$$,
  'later analysis of the same USA stock creates a new draft'
);

select is(
  (select outcome from public.commit_usa_monitoring_import_item(
    (select id from public.monitoring_import_items where external_id = 'usa-EME-2026-12-19'),
    '[]'::jsonb
  )),
  'committed',
  'later analysis commits'
);

select is(
  (select count(*)::integer from public.monitoring_results where stock_id = (select id from public.stocks where ticker = 'EME')),
  2,
  'same stock can keep two immutable analyses'
);

do $test_completion$
declare
  failure_report text;
begin
  select string_agg(result, E'\n') into failure_report from finish() as result;
  if failure_report is not null then raise exception '%', failure_report; end if;
end;
$test_completion$;

rollback;
