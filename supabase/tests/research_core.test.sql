begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(36);

select has_function(
  'public',
  'create_monitoring_with_thesis',
  array[
    'uuid', 'uuid', 'timestamp with time zone',
    'smallint', 'smallint', 'smallint', 'smallint', 'smallint',
    'text', 'text', 'jsonb', 'jsonb', 'numeric', 'character',
    'timestamp with time zone', 'numeric', 'text', 'uuid',
    'text', 'text', 'text', 'text', 'jsonb', 'jsonb', 'jsonb'
  ],
  'narrow atomic monitoring RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_monitoring_with_thesis(uuid,uuid,timestamptz,smallint,smallint,smallint,smallint,smallint,text,text,jsonb,jsonb,numeric,character,timestamptz,numeric,text,uuid,text,text,text,text,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated user can invoke monitoring RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_monitoring_with_thesis(uuid,uuid,timestamptz,smallint,smallint,smallint,smallint,smallint,text,text,jsonb,jsonb,numeric,character,timestamptz,numeric,text,uuid,text,text,text,text,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'anonymous user cannot invoke monitoring RPC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '14000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'm4-owner@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '14000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'm4-other@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

select public.initialize_default_statuses('14000000-0000-4000-8000-000000000001');
select public.initialize_default_statuses('14000000-0000-4000-8000-000000000002');

insert into public.stocks (id, market_id, ticker, name, exchange, currency, data_mode)
select '14000000-0000-4000-8000-000000000011', id, 'M4USD', 'M4 USD', 'NYSE', 'USD', 'manual'
from public.markets where code = 'USA';
insert into public.stocks (id, market_id, ticker, name, exchange, currency, data_mode)
select '14000000-0000-4000-8000-000000000012', id, 'M4PLN', 'M4 PLN', 'XWAR', 'PLN', 'manual'
from public.markets where code = 'GPW';

insert into public.watchlist_items (user_id, stock_id, current_status_id)
values
  (
    '14000000-0000-4000-8000-000000000001',
    '14000000-0000-4000-8000-000000000011',
    (select id from public.status_definitions where user_id = '14000000-0000-4000-8000-000000000001' and slug = 'WATCH')
  ),
  (
    '14000000-0000-4000-8000-000000000002',
    '14000000-0000-4000-8000-000000000012',
    (select id from public.status_definitions where user_id = '14000000-0000-4000-8000-000000000002' and slug = 'WATCH')
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-4000-8000-000000000001', true);

select is(
  (
    select outcome from public.create_monitoring_with_thesis(
      '14000000-0000-4000-8000-000000000011',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'DEEP_DIVE'),
      '2026-09-01T18:30:00Z', 80::smallint, 82::smallint, 74::smallint, 60::smallint, 76::smallint,
      'Accumulate', 'First snapshot', '["Backlog"]', '["Labor"]',
      100, 'USD', '2026-09-01T16:00:00Z', 4.00, null, null,
      'First thesis', 'Bull', 'Base', 'Bear', '["Awards"]', '["Labor"]', '["Backlog decline"]'
    )
  ),
  'created',
  'monitoring, thesis and status transaction succeeds'
);
select is(
  (select count(*)::integer from public.monitoring_results where user_id = auth.uid()),
  1,
  'monitoring snapshot is committed'
);
select is(
  (select count(*)::integer from public.investment_theses t join public.monitoring_results m on m.id = t.monitoring_result_id where m.user_id = auth.uid()),
  1,
  'thesis revision is committed'
);
select is(
  (select price_pln from public.monitoring_results where user_id = auth.uid()),
  400.000000::numeric,
  'USD price and FX preserve the historical PLN snapshot'
);
select is(
  (select sd.slug from public.watchlist_items wi join public.status_definitions sd on sd.id = wi.current_status_id where wi.user_id = auth.uid()),
  'DEEP_DIVE',
  'current watchlist status is updated atomically'
);

select is(
  (
    select outcome from public.create_monitoring_with_thesis(
      '14000000-0000-4000-8000-000000000011',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WAIT_FOR_CORRECTION'),
      '2026-09-02T18:30:00Z', 75::smallint, null, 70::smallint, 55::smallint, 72::smallint,
      'Wait', 'Correction snapshot', '[]', '[]', 98, 'USD',
      '2026-09-02T16:00:00Z', 4.10, null,
      (select id from public.monitoring_results where user_id = auth.uid() order by analyzed_at limit 1),
      null, null, null, null, '[]', '[]', '[]'
    )
  ),
  'created',
  'a correction inserts a new monitoring record'
);
select is(
  (select count(*)::integer from public.monitoring_results where user_id = auth.uid()),
  2,
  'superseded monitoring remains available'
);
select is(
  (select summary from public.monitoring_results where user_id = auth.uid() order by analyzed_at limit 1),
  'First snapshot',
  'correction leaves the original snapshot unchanged'
);
select ok(
  (select supersedes_id is not null from public.monitoring_results where user_id = auth.uid() order by analyzed_at desc limit 1),
  'correction points to its predecessor'
);

select is(
  (
    select outcome from public.create_monitoring_with_thesis(
      '14000000-0000-4000-8000-000000000011',
      (select id from public.status_definitions where user_id = '14000000-0000-4000-8000-000000000002' and slug = 'WATCH'),
      now(), null, null, null, null, null, null, null, '[]', '[]', 95, 'USD', now(), null, null, null,
      null, null, null, null, '[]', '[]', '[]'
    )
  ),
  'invalid_status',
  'another user status is rejected'
);
select is(
  (
    select outcome from public.create_monitoring_with_thesis(
      '14000000-0000-4000-8000-000000000012',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH'),
      now(), null, null, null, null, null, null, null, '[]', '[]', 95, 'PLN', now(), null, null, null,
      null, null, null, null, '[]', '[]', '[]'
    )
  ),
  'invalid_stock',
  'research for another user watchlist is rejected'
);
select is(
  (
    select outcome from public.create_monitoring_with_thesis(
      '14000000-0000-4000-8000-000000000011',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH'),
      now(), null, null, null, null, null, null, null, '[]', '[]', 95, 'PLN', now(), null, null, null,
      null, null, null, null, '[]', '[]', '[]'
    )
  ),
  'invalid_currency',
  'monitoring price currency must match stock currency'
);

select throws_ok(
  $$select * from public.create_monitoring_with_thesis(
    '14000000-0000-4000-8000-000000000011',
    (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH'),
    now(), null, null, null, null, null, null, null, '[]', '[]', 95, 'USD', now(), null, null, null,
    null, null, null, null, '{}'::jsonb, '[]', '[]'
  )$$,
  '22023',
  null,
  'thesis failure aborts the RPC'
);
select is(
  (select count(*)::integer from public.monitoring_results where user_id = auth.uid()),
  2,
  'thesis failure rolls back monitoring insert'
);
select is(
  (select sd.slug from public.watchlist_items wi join public.status_definitions sd on sd.id = wi.current_status_id where wi.user_id = auth.uid()),
  'WAIT_FOR_CORRECTION',
  'thesis failure leaves current status unchanged'
);

reset role;
create function pg_temp.reject_m4_status_update() returns trigger language plpgsql as $$
begin
  raise exception using errcode = '40001', message = 'forced status failure';
end;
$$;
create trigger reject_m4_status_update before update on public.watchlist_items
for each row execute function pg_temp.reject_m4_status_update();
set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select * from public.create_monitoring_with_thesis(
    '14000000-0000-4000-8000-000000000011',
    (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH'),
    now(), null, null, null, null, null, null, null, '[]', '[]', 95, 'USD', now(), null, null, null,
    'Would roll back', null, null, null, '[]', '[]', '[]'
  )$$,
  '40001',
  null,
  'status update failure aborts the RPC'
);
select is(
  (select count(*)::integer from public.monitoring_results where user_id = auth.uid()),
  2,
  'status failure rolls back monitoring insert'
);
select is(
  (select count(*)::integer from public.investment_theses t join public.monitoring_results m on m.id = t.monitoring_result_id where m.user_id = auth.uid()),
  1,
  'status failure rolls back thesis insert'
);
reset role;
drop trigger reject_m4_status_update on public.watchlist_items;

set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$insert into public.price_levels (user_id, stock_id, label, kind, value, currency, trigger_direction)
    values (auth.uid(), '14000000-0000-4000-8000-000000000011', 'Buy', 'buy', 90, 'USD', 'lte')$$,
  'owner can create a valid price level'
);
select throws_ok(
  $$insert into public.price_levels (user_id, stock_id, label, kind, value, currency, trigger_direction)
    values (auth.uid(), '14000000-0000-4000-8000-000000000011', 'Wrong', 'buy', 90, 'PLN', 'lte')$$,
  '23514', null, 'wrong price-level currency is rejected'
);
select throws_ok(
  $$insert into public.price_levels (user_id, stock_id, label, kind, value, currency, trigger_direction)
    values (auth.uid(), '14000000-0000-4000-8000-000000000011', 'Zero', 'buy', 0, 'USD', 'lte')$$,
  '23514', null, 'non-positive price level is rejected'
);
select throws_ok(
  $$insert into public.price_levels (user_id, stock_id, label, kind, value, currency, trigger_direction)
    values (auth.uid(), '14000000-0000-4000-8000-000000000011', 'Kind', 'invalid', 90, 'USD', 'lte')$$,
  '23514', null, 'invalid price-level kind is rejected'
);
select throws_ok(
  $$insert into public.price_levels (user_id, stock_id, label, kind, value, currency, trigger_direction)
    values (auth.uid(), '14000000-0000-4000-8000-000000000011', 'Direction', 'buy', 90, 'USD', 'invalid')$$,
  '23514', null, 'invalid trigger direction is rejected'
);

select lives_ok(
  format(
    'insert into public.notes (user_id, stock_id, content) values (auth.uid(), %L, %L)',
    '14000000-0000-4000-8000-000000000011', repeat('a', 10000)
  ),
  '10,000 character note is accepted'
);
select throws_ok(
  format(
    'insert into public.notes (user_id, stock_id, content) values (auth.uid(), %L, %L)',
    '14000000-0000-4000-8000-000000000011', repeat('b', 10001)
  ),
  '23514', null, 'note longer than 10,000 characters is rejected'
);
insert into public.notes (user_id, stock_id, content, is_pinned)
values (auth.uid(), '14000000-0000-4000-8000-000000000011', 'Pinned newest', true);
select is(
  (select content from public.notes where user_id = auth.uid() and deleted_at is null order by is_pinned desc, created_at desc limit 1),
  'Pinned newest',
  'notes sort pinned first and newest within a group'
);
update public.notes set deleted_at = now() where user_id = auth.uid() and content = 'Pinned newest';
select is(
  (select count(*)::integer from public.notes where user_id = auth.uid() and deleted_at is null),
  1,
  'soft-deleted note is hidden from the normal read predicate'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*)::integer from public.price_levels where user_id = '14000000-0000-4000-8000-000000000001'),
  0,
  'RLS hides another user price levels'
);
select lives_ok(
  $$update public.price_levels set label = 'Cross-user change' where user_id = '14000000-0000-4000-8000-000000000001'$$,
  'cross-user price-level update is an RLS no-op'
);
select is(
  (select count(*)::integer from public.notes where user_id = '14000000-0000-4000-8000-000000000001'),
  0,
  'RLS hides another user notes'
);
select lives_ok(
  $$update public.notes set content = 'Cross-user change' where user_id = '14000000-0000-4000-8000-000000000001'$$,
  'cross-user note update is an RLS no-op'
);

reset role;
select set_config('request.jwt.claim.sub', '14000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$update public.monitoring_results set summary = 'Changed' where user_id = auth.uid()$$,
  '55000', null, 'monitoring history is append-only'
);
select throws_ok(
  $$update public.investment_theses set summary = 'Changed' where monitoring_result_id in (select id from public.monitoring_results where user_id = auth.uid())$$,
  '55000', null, 'thesis revisions are append-only'
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
