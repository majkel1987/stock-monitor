begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

select has_view(
  'public',
  'dashboard_monitoring_summary',
  'dashboard monitoring read model exists'
);
select ok(
  has_table_privilege('authenticated', 'public.dashboard_monitoring_summary', 'SELECT'),
  'authenticated users can read the dashboard view'
);
select ok(
  not has_table_privilege('anon', 'public.dashboard_monitoring_summary', 'SELECT'),
  'anonymous users cannot read the dashboard view'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '15000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'm5-owner@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '15000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'm5-other@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

select public.initialize_default_statuses('15000000-0000-4000-8000-000000000001');
select public.initialize_default_statuses('15000000-0000-4000-8000-000000000002');

insert into public.stocks (id, market_id, ticker, name, exchange, currency, data_mode)
select '15000000-0000-4000-8000-000000000011', id, 'M5A', 'M5 Active', 'XWAR', 'PLN', 'manual'
from public.markets where code = 'GPW';
insert into public.stocks (id, market_id, ticker, name, exchange, currency, data_mode)
select '15000000-0000-4000-8000-000000000012', id, 'M5ARCH', 'M5 Archived', 'XWAR', 'PLN', 'manual'
from public.markets where code = 'GPW';
insert into public.stocks (id, market_id, ticker, name, exchange, currency, data_mode)
select '15000000-0000-4000-8000-000000000013', id, 'M5B', 'M5 Other', 'NYSE', 'USD', 'manual'
from public.markets where code = 'USA';

insert into public.watchlist_items (
  user_id, stock_id, current_status_id, archived_at
)
values
  (
    '15000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000011',
    (select id from public.status_definitions where user_id = '15000000-0000-4000-8000-000000000001' and slug = 'BUY_CANDIDATE'),
    null
  ),
  (
    '15000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000012',
    (select id from public.status_definitions where user_id = '15000000-0000-4000-8000-000000000001' and slug = 'WATCH'),
    now()
  ),
  (
    '15000000-0000-4000-8000-000000000002',
    '15000000-0000-4000-8000-000000000013',
    (select id from public.status_definitions where user_id = '15000000-0000-4000-8000-000000000002' and slug = 'WATCH'),
    null
  );

insert into public.monitoring_results (
  id, user_id, stock_id, status_definition_id, analyzed_at,
  investment_score, price, currency, price_as_of, supersedes_id
)
values
  (
    '15000000-0000-4000-8000-000000000021',
    '15000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000011',
    (select id from public.status_definitions where user_id = '15000000-0000-4000-8000-000000000001' and slug = 'WATCH'),
    '2026-08-01T12:00:00Z', 70, 100, 'PLN', '2026-08-01T11:30:00Z', null
  ),
  (
    '15000000-0000-4000-8000-000000000022',
    '15000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000011',
    (select id from public.status_definitions where user_id = '15000000-0000-4000-8000-000000000001' and slug = 'BUY_CANDIDATE'),
    '2026-09-01T12:00:00Z', 80, 95, 'PLN', '2026-09-01T11:30:00Z',
    '15000000-0000-4000-8000-000000000021'
  ),
  (
    '15000000-0000-4000-8000-000000000023',
    '15000000-0000-4000-8000-000000000001',
    '15000000-0000-4000-8000-000000000012',
    (select id from public.status_definitions where user_id = '15000000-0000-4000-8000-000000000001' and slug = 'WATCH'),
    '2026-09-02T12:00:00Z', 60, 50, 'PLN', '2026-09-02T11:30:00Z', null
  ),
  (
    '15000000-0000-4000-8000-000000000024',
    '15000000-0000-4000-8000-000000000002',
    '15000000-0000-4000-8000-000000000013',
    (select id from public.status_definitions where user_id = '15000000-0000-4000-8000-000000000002' and slug = 'WATCH'),
    '2026-09-03T12:00:00Z', 65, 75, 'USD', '2026-09-03T11:30:00Z', null
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '15000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::integer from public.dashboard_monitoring_summary),
  1,
  'owner view excludes archived, superseded and cross-user rows'
);
select is(
  (select stock_id from public.dashboard_monitoring_summary),
  '15000000-0000-4000-8000-000000000011'::uuid,
  'owner receives the active watchlist stock only'
);
select is(
  (select status_slug from public.dashboard_monitoring_summary),
  'BUY_CANDIDATE',
  'correction is the current monitoring decision'
);
select is(
  (select previous_status_slug from public.dashboard_monitoring_summary),
  'WATCH',
  'correction retains its explicit predecessor for transition display'
);
select is(
  (select previous_investment_score from public.dashboard_monitoring_summary),
  70::smallint,
  'correction retains the predecessor score'
);
select ok(
  (select stock_rank = 1 and recent_rank = 1 from public.dashboard_monitoring_summary),
  'current and recent ranks are deterministic after correction filtering'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '15000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*)::integer from public.dashboard_monitoring_summary),
  1,
  'another authenticated user sees only their own dashboard context'
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
