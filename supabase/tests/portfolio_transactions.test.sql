begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

select has_table('public', 'portfolio_transactions', 'portfolio BUY transactions table exists');
select col_type_is('public', 'portfolio_transactions', 'quantity', 'numeric(20,8)', 'quantity uses exact numeric storage');
select col_type_is('public', 'portfolio_transactions', 'price_per_share', 'numeric(20,6)', 'purchase price uses exact numeric storage');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '19000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'portfolio-owner@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '19000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'portfolio-other@example.com',
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now(), '', '', '', ''
  );

select public.initialize_default_statuses('19000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub', '19000000-0000-4000-8000-000000000001', true);

select is(
  (
    select outcome from public.add_manual_stock_to_watchlist(
      'GPW', 'PORT', 'Portfolio Test',
      (select id from public.status_definitions where user_id = auth.uid() and slug = 'WATCH')
    )
  ),
  'created',
  'test stock is available through the canonical stock model'
);

insert into public.portfolio_transactions (
  user_id, stock_id, transaction_date, quantity, price_per_share, currency
) values (
  auth.uid(),
  (select id from public.stocks where ticker = 'PORT'),
  '2026-09-01', 1.5, 20.25, 'PLN'
);

select is(
  (select count(*)::integer from public.portfolio_transactions),
  1,
  'owner can create a BUY lot'
);
select is(
  (select transaction_type from public.portfolio_transactions),
  'BUY',
  'BUY is the only current transaction type'
);
select throws_ok(
  $$
    insert into public.portfolio_transactions (
      user_id, stock_id, transaction_type, transaction_date, quantity, price_per_share, currency
    ) values (
      auth.uid(), (select id from public.stocks where ticker = 'PORT'),
      'SELL', '2026-09-02', 1, 20, 'PLN'
    )
  $$,
  '23514',
  null,
  'SELL is intentionally not implemented'
);
select throws_ok(
  $$
    insert into public.portfolio_transactions (
      user_id, stock_id, transaction_date, quantity, price_per_share, currency
    ) values (
      auth.uid(), (select id from public.stocks where ticker = 'PORT'),
      '2026-09-02', 1, 20, 'USD'
    )
  $$,
  '23514',
  'portfolio transaction currency must match stock currency',
  'transaction currency must match canonical stock currency'
);

update public.portfolio_transactions set quantity = 2.25;
select is(
  (select quantity from public.portfolio_transactions),
  2.25::numeric,
  'owner can edit a transaction'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '19000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*)::integer from public.portfolio_transactions),
  0,
  'RLS hides another user portfolio'
);
select lives_ok(
  $$ update public.portfolio_transactions set quantity = 999 $$,
  'cross-user update is a no-op'
);

reset role;
select is(
  (select quantity from public.portfolio_transactions),
  2.25::numeric,
  'cross-user update did not change the lot'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '19000000-0000-4000-8000-000000000001', true);
delete from public.portfolio_transactions;
select is(
  (select count(*)::integer from public.portfolio_transactions),
  0,
  'owner can delete a transaction'
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
