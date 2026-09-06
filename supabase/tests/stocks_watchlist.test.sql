begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(27);

select has_function(
  'public',
  'add_manual_stock_to_watchlist',
  array['text', 'text', 'text', 'uuid'],
  'atomic manual Add Stock function exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.add_manual_stock_to_watchlist(text,text,text,uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot add stocks'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.add_manual_stock_to_watchlist(text,text,text,uuid)',
    'EXECUTE'
  ),
  'authenticated users can invoke the narrow Add Stock function'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '12000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'm3-owner@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '12000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'm3-other@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

select public.initialize_default_statuses('12000000-0000-0000-0000-000000000001');
select public.initialize_default_statuses('12000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

select is(
  (
    select outcome
    from public.add_manual_stock_to_watchlist(
      'GPW',
      'M3ABC',
      'M3 Example',
      (
        select id from public.status_definitions
        where user_id = auth.uid() and slug = 'WATCH'
      )
    )
  ),
  'created',
  'a new manual GPW stock is added'
);
select is(
  (
    select count(*)::integer from public.stocks s
    join public.markets m on m.id = s.market_id
    where m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  1,
  'canonical market and ticker create one stock'
);
select is(
  (
    select data_mode from public.stocks s
    join public.markets m on m.id = s.market_id
    where m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  'manual',
  'manual Add Stock records manual data mode'
);
select is(
  (
    select s.currency::text from public.stocks s
    join public.markets m on m.id = s.market_id
    where m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  'PLN',
  'stock currency comes from the GPW market record'
);
select is(
  (
    select count(*)::integer from public.stock_provider_symbols p
    join public.stocks s on s.id = p.stock_id
    where s.ticker = 'M3ABC'
  ),
  0,
  'manual Add Stock does not invent a provider mapping'
);
select is(
  (
    select outcome
    from public.add_manual_stock_to_watchlist(
      'GPW',
      'M3ABC',
      'Ignored duplicate name',
      (
        select id from public.status_definitions
        where user_id = auth.uid() and slug = 'WATCH'
      )
    )
  ),
  'already_active',
  'adding an active stock returns a controlled result'
);
select is(
  (
    select count(*)::integer from public.watchlist_items wi
    join public.stocks s on s.id = wi.stock_id
    join public.markets m on m.id = s.market_id
    where wi.user_id = auth.uid() and m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  1,
  'one durable watchlist row exists for the stock'
);
select is(
  (
    select outcome
    from public.add_manual_stock_to_watchlist(
      'USA',
      'M3ABC',
      'M3 USA Example',
      (
        select id from public.status_definitions
        where user_id = auth.uid() and slug = 'WATCH'
      )
    )
  ),
  'created',
  'the same ticker text is allowed in another market'
);
select is(
  (select count(*)::integer from public.stocks where ticker = 'M3ABC'),
  2,
  'market remains part of canonical stock identity'
);
select lives_ok(
  $$
    update public.watchlist_items wi
    set archived_at = now()
    from public.stocks s, public.markets m
    where wi.stock_id = s.id
      and s.market_id = m.id
      and wi.user_id = auth.uid()
      and m.code = 'GPW'
      and s.ticker = 'M3ABC'
  $$,
  'the owner can archive a watchlist item'
);
select ok(
  (
    select archived_at is not null from public.watchlist_items wi
    join public.stocks s on s.id = wi.stock_id
    join public.markets m on m.id = s.market_id
    where wi.user_id = auth.uid() and m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  'archive sets archived_at'
);
select is(
  (
    select count(*)::integer from public.stocks s
    join public.markets m on m.id = s.market_id
    where m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  1,
  'archive preserves the stock'
);
select is(
  (
    select outcome
    from public.add_manual_stock_to_watchlist(
      'GPW',
      'M3ABC',
      'M3 Example',
      (
        select id from public.status_definitions
        where user_id = auth.uid() and slug = 'BUY_CANDIDATE'
      )
    )
  ),
  'restored',
  're-adding an archived stock restores it'
);
select ok(
  (
    select archived_at is null from public.watchlist_items wi
    join public.stocks s on s.id = wi.stock_id
    join public.markets m on m.id = s.market_id
    where wi.user_id = auth.uid() and m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  'restore clears archived_at'
);
select is(
  (
    select count(*)::integer from public.watchlist_items wi
    join public.stocks s on s.id = wi.stock_id
    join public.markets m on m.id = s.market_id
    where wi.user_id = auth.uid() and m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  1,
  'restore reuses the original watchlist row'
);
select is(
  (
    select sd.slug from public.watchlist_items wi
    join public.stocks s on s.id = wi.stock_id
    join public.markets m on m.id = s.market_id
    join public.status_definitions sd on sd.id = wi.current_status_id
    where wi.user_id = auth.uid() and m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  'BUY_CANDIDATE',
  'restore applies the newly selected active status'
);
select is(
  (
    select outcome
    from public.add_manual_stock_to_watchlist(
      'GPW',
      'M3BADSTATUS',
      'Invalid status example',
      (
        select id from public.status_definitions
        where user_id = '12000000-0000-0000-0000-000000000002'
          and slug = 'WATCH'
      )
    )
  ),
  'invalid_status',
  'a user cannot assign another user status'
);
select is(
  (select count(*)::integer from public.stocks where ticker = 'M3BADSTATUS'),
  0,
  'invalid status validation happens before stock creation'
);
select lives_ok(
  $$
    update public.watchlist_items wi
    set archived_at = now()
    from public.stocks s, public.markets m
    where wi.stock_id = s.id
      and s.market_id = m.id
      and wi.user_id = auth.uid()
      and m.code = 'GPW'
      and s.ticker = 'M3ABC'
  $$,
  'archive remains a reversible update'
);
select lives_ok(
  $$
    update public.watchlist_items wi
    set archived_at = null
    from public.stocks s, public.markets m
    where wi.stock_id = s.id
      and s.market_id = m.id
      and wi.user_id = auth.uid()
      and m.code = 'GPW'
      and s.ticker = 'M3ABC'
  $$,
  'restore remains a reversible update'
);
select ok(
  (
    select archived_at is null from public.watchlist_items wi
    join public.stocks s on s.id = wi.stock_id
    join public.markets m on m.id = s.market_id
    where wi.user_id = auth.uid() and m.code = 'GPW' and s.ticker = 'M3ABC'
  ),
  'direct restore clears archived_at'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);
select is(
  (
    select count(*)::integer from public.watchlist_items
    where user_id = '12000000-0000-0000-0000-000000000001'
  ),
  0,
  'RLS hides the other user watchlist'
);
select lives_ok(
  $$
    update public.watchlist_items
    set archived_at = now()
    where user_id = '12000000-0000-0000-0000-000000000001'
  $$,
  'RLS makes a cross-user archive attempt a no-op'
);

reset role;
select ok(
  (
    select bool_and(archived_at is null)
    from public.watchlist_items
    where user_id = '12000000-0000-0000-0000-000000000001'
  ),
  'another user cannot change owner archive state'
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
