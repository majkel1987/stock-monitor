begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(29);

select has_table('public', 'fx_rates', 'current/daily FX persistence exists');
select has_function(
  'public',
  'add_provider_stock_to_watchlist',
  array['text','text','text','text','character','text','text','text','uuid','jsonb'],
  'provider-backed Add Stock RPC exists'
);
select has_function(
  'public',
  'submit_manual_market_quote',
  array['uuid','numeric','character','timestamp with time zone'],
  'manual quote RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_manual_market_quote(uuid,numeric,character,timestamptz)',
    'EXECUTE'
  ),
  'authenticated user can submit a narrow manual quote'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.submit_manual_market_quote(uuid,numeric,character,timestamptz)',
    'EXECUTE'
  ),
  'anonymous users cannot submit quotes'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.upsert_fx_rate(text,date,numeric,timestamptz,timestamptz,text)',
    'EXECUTE'
  ),
  'FX writes are restricted to the server synchronization role'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '16000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'm6-owner@example.com',
  extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(), '', '', '', ''
);

select public.initialize_default_statuses('16000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '16000000-0000-4000-8000-000000000001', true);

select is(
  (
    select outcome from public.add_provider_stock_to_watchlist(
      'GPW', 'PZU', 'PZU SA', 'WAR', 'PLN', 'PLPZU0000011',
      'EODHD', 'PZU.WAR',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH'),
      '{"verifiedBy":"test"}'::jsonb
    )
  ),
  'created',
  'verified EODHD candidate creates a watchlist stock'
);
select is(
  (
    select s.ticker from public.stocks s
    join public.markets m on m.id = s.market_id
    where m.code = 'GPW' and s.ticker = 'PZU'
  ),
  'PZU',
  'canonical ticker does not contain the provider suffix'
);
select is(
  (
    select provider_symbol from public.stock_provider_symbols p
    join public.stocks s on s.id = p.stock_id
    where s.ticker = 'PZU' and p.provider = 'EODHD'
  ),
  'PZU.WAR',
  'verified provider symbol is persisted separately'
);
select is(
  (
    select data_mode from public.stocks s
    join public.markets m on m.id = s.market_id
    where m.code = 'GPW' and s.ticker = 'PZU'
  ),
  'provider',
  'provider-backed stock is marked as provider data mode'
);
select is(
  (
    select outcome from public.add_provider_stock_to_watchlist(
      'GPW', 'OTHER', 'Other SA', 'WAR', 'PLN', null,
      'EODHD', 'PZU.WAR',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH'),
      '{}'::jsonb
    )
  ),
  'mapping_conflict',
  'an existing provider symbol cannot be reassigned to another canonical stock'
);

select is(
  (
    select public.submit_manual_market_quote(
      (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
      100, 'PLN', now() - interval '1 hour'
    )
  ),
  'saved',
  'a valid manual quote is saved'
);
select is(
  (
    select public.submit_manual_market_quote(
      (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
      90, 'PLN', now() - interval '2 hours'
    )
  ),
  'quote_older_than_stored',
  'an older manual quote is deterministically skipped'
);
select is(
  (
    select public.submit_manual_market_quote(
      (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
      100, 'PLN', now() - interval '1 hour'
    )
  ),
  'quote_older_than_stored',
  'an equal timestamp is deterministically skipped'
);
select is(
  (
    select public.submit_manual_market_quote(
      (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
      105, 'PLN', now() - interval '30 minutes'
    )
  ),
  'saved',
  'a newer manual quote replaces the current quote'
);
select is(
  (
    select public.submit_manual_market_quote(
      (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
      0, 'PLN', now()
    )
  ),
  'invalid_price',
  'a non-positive manual quote is rejected'
);
select is(
  (
    select public.submit_manual_market_quote(
      (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
      105, 'USD', now()
    )
  ),
  'currency_mismatch',
  'a manual quote in the wrong currency is rejected'
);
select is(
  (select price from public.market_quotes q join public.stocks s on s.id = q.stock_id where s.ticker = 'PZU'),
  105::numeric,
  'rejected and older quotes leave the latest stored price intact'
);

reset role;
set local role service_role;

select is(
  public.upsert_market_quote(
    (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
    101, null, null, null, null, null, null, 'PLN',
    now() - interval '45 minutes', now(), 'EODHD', null, 'delayed'
  ),
  false,
  'an older provider quote cannot replace a newer manual quote'
);
select is(
  public.upsert_market_quote(
    (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'GPW' and s.ticker = 'PZU'),
    110, 108, 1.85, null, 1000, null, null, 'PLN',
    now() - interval '10 minutes', now(), 'EODHD', null, 'fresh'
  ),
  true,
  'a newer provider quote replaces the current manual quote'
);
select is(
  (select price from public.market_quotes q join public.stocks s on s.id = q.stock_id where s.ticker = 'PZU'),
  110::numeric,
  'conditional provider upsert stores the newer value'
);

select ok(
  public.upsert_fx_rate(
    'USDPLN', current_date, 4.20, now(), now(), 'NBP'
  ),
  'NBP USD/PLN reference rate is persisted'
);
select is(
  (select rate from public.fx_rates where pair = 'USDPLN' and provider = 'NBP' and effective_date = current_date),
  4.20::numeric,
  'stored FX rate preserves numeric precision'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '16000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::integer from public.fx_rates where pair = 'USDPLN'),
  1,
  'authenticated user can read the stored reference FX rate'
);

select is(
  (
    select outcome from public.add_manual_stock_to_watchlist(
      'USA', 'M6USD', 'M6 USD',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH')
    )
  ),
  'created',
  'USD stock is available for FX snapshot regression coverage'
);
select is(
  (
    select outcome from public.create_monitoring_with_thesis(
      (select s.id from public.stocks s join public.markets m on m.id = s.market_id where m.code = 'USA' and s.ticker = 'M6USD'),
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH'),
      now(), null, null, null, null, null,
      null, 'FX snapshot', '[]', '[]', 100, 'USD', now(), 4.00,
      null, null, null, null, null, null, '[]', '[]', '[]'
    )
  ),
  'created',
  'monitoring stores an explicit USD/PLN snapshot'
);

reset role;
set local role service_role;
select ok(
  public.upsert_fx_rate(
    'USDPLN', current_date + 1, 4.30, now() + interval '1 day', now() + interval '1 second', 'NBP'
  ),
  'a later NBP rate can become current independently'
);
select is(
  (
    select fx_usd_pln from public.monitoring_results
    where user_id = '16000000-0000-4000-8000-000000000001'
      and summary = 'FX snapshot'
  ),
  4.00::numeric,
  'new NBP rates never mutate a historical monitoring FX snapshot'
);

select is(
  (
    select count(*)::integer from public.market_quotes q
    join public.stocks s on s.id = q.stock_id
    where s.ticker = 'PZU'
  ),
  1,
  'market_quotes retains only one current quote per stock'
);

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
