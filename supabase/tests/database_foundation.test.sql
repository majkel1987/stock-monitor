begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(54);

select has_table('public', 'markets', 'markets table exists');
select has_table('public', 'stocks', 'stocks table exists');
select has_table('public', 'stock_provider_symbols', 'provider symbol mapping table exists');
select has_table('public', 'status_definitions', 'status definitions table exists');
select has_table('public', 'watchlist_items', 'watchlist table exists');
select has_table('public', 'market_quotes', 'latest quote table exists');
select has_table('public', 'stock_prices', 'EOD price history table exists');
select has_table('public', 'price_levels', 'price levels table exists');
select has_table('public', 'monitoring_results', 'monitoring history table exists');
select has_table('public', 'investment_theses', 'thesis revisions table exists');
select has_table('public', 'notes', 'notes table exists');
select has_table('public', 'sync_runs', 'sync run table exists');
select has_table('public', 'audit_events', 'audit event table exists');
select has_function('public', 'upsert_market_quote', 'conditional quote upsert exists');
select has_function('public', 'initialize_default_statuses', 'default status initializer exists');

select ok(
  not has_function_privilege('anon', 'public.initialize_default_statuses(uuid)', 'EXECUTE'),
  'anonymous users cannot initialize statuses'
);

select ok(
  not has_function_privilege('authenticated', 'public.initialize_default_statuses(uuid)', 'EXECUTE'),
  'status initialization is an administrative operation'
);

select ok(
  not has_table_privilege('anon', 'public.monitoring_results', 'SELECT'),
  'anonymous users have no access to monitoring history'
);

select ok(
  not has_table_privilege('authenticated', 'public.watchlist_items', 'DELETE'),
  'normal user operations archive rather than hard-delete watchlist rows'
);

select is(
  (select count(*)::integer from public.markets where code in ('GPW', 'USA')),
  2,
  'seed creates GPW and USA markets'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'owner@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'other@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

select is(
  public.initialize_default_statuses('11111111-1111-1111-1111-111111111111'),
  8,
  'status initializer creates all eight defaults'
);

select is(
  public.initialize_default_statuses('11111111-1111-1111-1111-111111111111'),
  0,
  'status initializer is idempotent'
);

select public.initialize_default_statuses('22222222-2222-2222-2222-222222222222');

insert into public.stocks (
  id,
  market_id,
  ticker,
  name,
  exchange,
  currency,
  data_mode
)
select
  '33333333-3333-3333-3333-333333333333',
  id,
  'PZU',
  'Powszechny Zaklad Ubezpieczen',
  'Warsaw Stock Exchange',
  'PLN',
  'provider'
from public.markets
where code = 'GPW';

select throws_matching(
  $$
    insert into public.stocks (market_id, ticker, name, exchange, currency, data_mode)
    select id, 'pzu', 'Duplicate', 'Warsaw Stock Exchange', 'PLN', 'provider'
    from public.markets where code = 'GPW'
  $$,
  '.*stocks_market_id_ticker_key.*',
  'market and case-insensitive ticker are unique'
);

insert into public.watchlist_items (id, user_id, stock_id, current_status_id)
select
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  id
from public.status_definitions
where user_id = '11111111-1111-1111-1111-111111111111'
  and slug = 'WATCH';

select throws_matching(
  $$
    insert into public.watchlist_items (user_id, stock_id, current_status_id)
    select
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  '.*watchlist_items_user_id_stock_id_key.*',
  'one durable watchlist row exists per user and stock'
);

select throws_matching(
  $$
    insert into public.monitoring_results (
      user_id, stock_id, status_definition_id, investment_score,
      price, currency, price_as_of, source_type
    )
    select
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id, -1, 10, 'PLN', now(), 'manual'
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  '.*monitoring_results_investment_score_check.*',
  'score -1 is rejected'
);

select throws_matching(
  $$
    insert into public.monitoring_results (
      user_id, stock_id, status_definition_id, investment_score,
      price, currency, price_as_of, source_type
    )
    select
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id, 101, 10, 'PLN', now(), 'manual'
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  '.*monitoring_results_investment_score_check.*',
  'score 101 is rejected'
);

select lives_ok(
  $$
    insert into public.monitoring_results (
      id, user_id, stock_id, status_definition_id, investment_score,
      price, currency, price_as_of, source_type
    )
    select
      '50000000-0000-0000-0000-000000000000',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id, 0, 10, 'PLN', now(), 'manual'
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  'score 0 is accepted'
);

select lives_ok(
  $$
    insert into public.monitoring_results (
      id, user_id, stock_id, status_definition_id, investment_score,
      price, currency, price_as_of, source_type
    )
    select
      '50000000-0000-0000-0000-000000000100',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id, 100, 10, 'PLN', now(), 'manual'
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  'score 100 is accepted'
);

select lives_ok(
  $$
    insert into public.monitoring_results (
      id, user_id, stock_id, status_definition_id, investment_score,
      price, currency, price_as_of, source_type
    )
    select
      '50000000-0000-0000-0000-000000000999',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id, null, 10, 'PLN', now(), 'manual'
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  'NULL score is accepted'
);

select throws_matching(
  $$
    insert into public.price_levels (
      user_id, stock_id, label, kind, value, currency, trigger_direction
    ) values (
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      'Invalid', 'buy', 0, 'PLN', 'lte'
    )
  $$,
  '.*price_levels_value_check.*',
  'non-positive price level is rejected'
);

select throws_matching(
  $$
    insert into public.price_levels (
      user_id, stock_id, label, kind, value, currency, trigger_direction
    ) values (
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      'Invalid', 'buy', 10, 'PLN', 'crosses'
    )
  $$,
  '.*price_levels_trigger_direction_check.*',
  'unknown trigger direction is rejected'
);

select throws_matching(
  $$
    insert into public.price_levels (
      user_id, stock_id, label, kind, value, currency, trigger_direction
    ) values (
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      'Invalid', 'strong_buy', 10, 'PLN', 'lte'
    )
  $$,
  '.*price_levels_kind_check.*',
  'unknown price level kind is rejected'
);

select throws_matching(
  $$
    insert into public.monitoring_results (
      id, user_id, stock_id, status_definition_id, price,
      currency, price_as_of, source_type, supersedes_id
    )
    select
      '50000000-0000-0000-0000-000000000001',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id, 10, 'PLN', now(), 'manual',
      '50000000-0000-0000-0000-000000000001'
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  '.*monitoring_results_not_self_superseding_check.*',
  'a monitoring result cannot supersede itself'
);

insert into public.monitoring_results (
  id, user_id, stock_id, status_definition_id, analyzed_at,
  investment_score, summary, price, currency, price_as_of, source_type
)
select
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  id,
  '2026-09-01 12:00:00+00',
  50,
  'Original analysis',
  50,
  'PLN',
  '2026-09-01 11:30:00+00',
  'manual'
from public.status_definitions
where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH';

select lives_ok(
  $$
    insert into public.monitoring_results (
      id, user_id, stock_id, status_definition_id, analyzed_at,
      investment_score, summary, price, currency, price_as_of,
      source_type, supersedes_id
    )
    select
      'aaaaaaaa-0000-0000-0000-000000000002',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      id,
      '2026-09-02 12:00:00+00',
      55,
      'Corrected analysis',
      51,
      'PLN',
      '2026-09-02 11:30:00+00',
      'manual',
      'aaaaaaaa-0000-0000-0000-000000000001'
    from public.status_definitions
    where user_id = '11111111-1111-1111-1111-111111111111' and slug = 'WATCH'
  $$,
  'a correction is inserted as a new monitoring result'
);

select is(
  (select summary from public.monitoring_results where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Original analysis',
  'the superseded monitoring result remains unchanged'
);

select throws_matching(
  $$
    update public.monitoring_results
    set summary = 'Silently changed'
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  $$,
  '.*monitoring results are immutable.*',
  'historical monitoring content cannot be updated'
);

select lives_ok(
  $$
    update public.monitoring_results
    set deleted_at = now()
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  $$,
  'a monitoring result supports explicit soft delete'
);

select throws_matching(
  $$delete from public.monitoring_results where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '.*monitoring results are append-only.*',
  'historical monitoring cannot be hard-deleted'
);

insert into public.investment_theses (
  id,
  stock_id,
  monitoring_result_id,
  summary
)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'Historical thesis'
);

select throws_matching(
  $$
    update public.investment_theses
    set summary = 'Changed thesis'
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'
  $$,
  '.*investment theses are immutable.*',
  'a thesis revision cannot be updated'
);

select lives_ok(
  $$delete from public.watchlist_items where id = '44444444-4444-4444-4444-444444444444'$$,
  'deleting a watchlist row does not cascade into stock history'
);

select is(
  (
    select count(*)::integer
    from public.monitoring_results
    where stock_id = '33333333-3333-3333-3333-333333333333'
  ),
  5,
  'monitoring history remains after a watchlist row is deleted'
);

insert into public.notes (
  id, user_id, stock_id, content
)
values (
  'cccccccc-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  'A note'
);

select lives_ok(
  $$
    update public.notes
    set deleted_at = now()
    where id = 'cccccccc-0000-0000-0000-000000000001'
  $$,
  'notes support soft delete'
);

select throws_matching(
  $$
    insert into public.notes (user_id, stock_id, content)
    values (
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      repeat('x', 10001)
    )
  $$,
  '.*notes_content_length_check.*',
  'notes longer than 10000 characters are rejected'
);

select ok(
  public.upsert_market_quote(
    '33333333-3333-3333-3333-333333333333',
    100,
    99,
    1.01,
    null,
    1000,
    120,
    80,
    'PLN',
    '2026-09-03 12:00:00+00',
    '2026-09-03 12:00:05+00',
    'fixture',
    'newest',
    'ok'
  ),
  'the first quote is inserted'
);

select is(
  public.upsert_market_quote(
    '33333333-3333-3333-3333-333333333333',
    999,
    null,
    null,
    null,
    null,
    null,
    null,
    'PLN',
    '2026-09-03 12:00:00+00',
    '2026-09-03 12:01:00+00',
    'fixture',
    'same-time',
    'ok'
  ),
  false,
  'a quote with an equal as_of is also ignored'
);

select is(
  public.upsert_market_quote(
    '33333333-3333-3333-3333-333333333333',
    90,
    89,
    1.01,
    null,
    900,
    110,
    70,
    'PLN',
    '2026-09-03 11:30:00+00',
    '2026-09-03 12:01:00+00',
    'fixture',
    'older',
    'ok'
  ),
  false,
  'an older quote is ignored'
);

select is(
  (select price from public.market_quotes where stock_id = '33333333-3333-3333-3333-333333333333'),
  100::numeric,
  'an older quote does not replace the stored price'
);

select ok(
  public.upsert_market_quote(
    '33333333-3333-3333-3333-333333333333',
    110,
    100,
    10,
    null,
    1200,
    125,
    80,
    'PLN',
    '2026-09-03 12:30:00+00',
    '2026-09-03 12:30:05+00',
    'fixture',
    'newer',
    'ok'
  ),
  'a newer quote updates the snapshot'
);

select is(
  (select price from public.market_quotes where stock_id = '33333333-3333-3333-3333-333333333333'),
  110::numeric,
  'a newer quote replaces the stored price'
);

select lives_ok(
  $$
    update public.market_quotes
    set price = 80, as_of = '2026-09-03 12:00:00+00'
    where stock_id = '33333333-3333-3333-3333-333333333333'
  $$,
  'direct stale quote updates are safely ignored'
);

select is(
  (select price from public.market_quotes where stock_id = '33333333-3333-3333-3333-333333333333'),
  110::numeric,
  'the stale-update trigger protects the latest quote'
);

select is(
  (select price from public.monitoring_results where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  50::numeric,
  'live quote changes never rewrite the historical analysis price'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select is(
  (select count(*)::integer from public.status_definitions),
  8,
  'RLS exposes the current user statuses'
);

select is(
  (
    select count(*)::integer
    from public.status_definitions
    where user_id = '22222222-2222-2222-2222-222222222222'
  ),
  0,
  'RLS hides another user statuses'
);

reset role;

-- Management API returns only the last result set. Turn any pgTAP failure or
-- plan mismatch into a SQL error so a remote run cannot report a false pass.
do $test_completion$
declare
  failure_report text;
begin
  select string_agg(result, E'\n') into failure_report
  from finish() as result;

  if failure_report is not null then
    raise exception '%', failure_report;
  end if;
end;
$test_completion$;
rollback;
