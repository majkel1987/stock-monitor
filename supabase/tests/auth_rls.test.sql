begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(229);

select ok((select relrowsecurity from pg_class where oid = 'public.markets'::regclass), 'markets: RLS enabled');

select ok(not has_table_privilege('anon', 'public.markets', 'SELECT'), 'markets: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.markets', 'INSERT'), 'markets: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.markets', 'UPDATE'), 'markets: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.markets', 'DELETE'), 'markets: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.stocks'::regclass), 'stocks: RLS enabled');

select ok(not has_table_privilege('anon', 'public.stocks', 'SELECT'), 'stocks: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.stocks', 'INSERT'), 'stocks: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.stocks', 'UPDATE'), 'stocks: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.stocks', 'DELETE'), 'stocks: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.stock_provider_symbols'::regclass), 'stock_provider_symbols: RLS enabled');

select ok(not has_table_privilege('anon', 'public.stock_provider_symbols', 'SELECT'), 'stock_provider_symbols: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.stock_provider_symbols', 'INSERT'), 'stock_provider_symbols: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.stock_provider_symbols', 'UPDATE'), 'stock_provider_symbols: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.stock_provider_symbols', 'DELETE'), 'stock_provider_symbols: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.status_definitions'::regclass), 'status_definitions: RLS enabled');

select ok(not has_table_privilege('anon', 'public.status_definitions', 'SELECT'), 'status_definitions: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.status_definitions', 'INSERT'), 'status_definitions: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.status_definitions', 'UPDATE'), 'status_definitions: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.status_definitions', 'DELETE'), 'status_definitions: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.watchlist_items'::regclass), 'watchlist_items: RLS enabled');

select ok(not has_table_privilege('anon', 'public.watchlist_items', 'SELECT'), 'watchlist_items: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.watchlist_items', 'INSERT'), 'watchlist_items: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.watchlist_items', 'UPDATE'), 'watchlist_items: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.watchlist_items', 'DELETE'), 'watchlist_items: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.market_quotes'::regclass), 'market_quotes: RLS enabled');

select ok(not has_table_privilege('anon', 'public.market_quotes', 'SELECT'), 'market_quotes: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.market_quotes', 'INSERT'), 'market_quotes: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.market_quotes', 'UPDATE'), 'market_quotes: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.market_quotes', 'DELETE'), 'market_quotes: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.stock_prices'::regclass), 'stock_prices: RLS enabled');

select ok(not has_table_privilege('anon', 'public.stock_prices', 'SELECT'), 'stock_prices: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.stock_prices', 'INSERT'), 'stock_prices: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.stock_prices', 'UPDATE'), 'stock_prices: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.stock_prices', 'DELETE'), 'stock_prices: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.price_levels'::regclass), 'price_levels: RLS enabled');

select ok(not has_table_privilege('anon', 'public.price_levels', 'SELECT'), 'price_levels: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.price_levels', 'INSERT'), 'price_levels: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.price_levels', 'UPDATE'), 'price_levels: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.price_levels', 'DELETE'), 'price_levels: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.monitoring_results'::regclass), 'monitoring_results: RLS enabled');

select ok(not has_table_privilege('anon', 'public.monitoring_results', 'SELECT'), 'monitoring_results: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.monitoring_results', 'INSERT'), 'monitoring_results: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.monitoring_results', 'UPDATE'), 'monitoring_results: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.monitoring_results', 'DELETE'), 'monitoring_results: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.investment_theses'::regclass), 'investment_theses: RLS enabled');

select ok(not has_table_privilege('anon', 'public.investment_theses', 'SELECT'), 'investment_theses: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.investment_theses', 'INSERT'), 'investment_theses: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.investment_theses', 'UPDATE'), 'investment_theses: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.investment_theses', 'DELETE'), 'investment_theses: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.notes'::regclass), 'notes: RLS enabled');

select ok(not has_table_privilege('anon', 'public.notes', 'SELECT'), 'notes: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.notes', 'INSERT'), 'notes: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.notes', 'UPDATE'), 'notes: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.notes', 'DELETE'), 'notes: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.sync_runs'::regclass), 'sync_runs: RLS enabled');

select ok(not has_table_privilege('anon', 'public.sync_runs', 'SELECT'), 'sync_runs: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.sync_runs', 'INSERT'), 'sync_runs: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.sync_runs', 'UPDATE'), 'sync_runs: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.sync_runs', 'DELETE'), 'sync_runs: anon has no DELETE');

select ok((select relrowsecurity from pg_class where oid = 'public.audit_events'::regclass), 'audit_events: RLS enabled');

select ok(not has_table_privilege('anon', 'public.audit_events', 'SELECT'), 'audit_events: anon has no SELECT');

select ok(not has_table_privilege('anon', 'public.audit_events', 'INSERT'), 'audit_events: anon has no INSERT');

select ok(not has_table_privilege('anon', 'public.audit_events', 'UPDATE'), 'audit_events: anon has no UPDATE');

select ok(not has_table_privilege('anon', 'public.audit_events', 'DELETE'), 'audit_events: anon has no DELETE');

insert into auth.users (id, email) values ('20000000-0000-0000-0000-000000000001', 'm2-a@example.test'), ('20000000-0000-0000-0000-000000000002', 'm2-b@example.test');
insert into public.stocks (id, market_id, ticker, name, exchange, currency, data_mode)
select '90000000-0000-0000-0000-000000000001', id, 'M2_RLS_FIXTURE', 'M2 fixture', 'XWAR', 'PLN', 'manual' from public.markets where code = 'GPW';

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select lives_ok($$insert into public.status_definitions (id,user_id,slug,label,color_token,dashboard_group) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','M2','M2','info','watch')$$, 'status_definitions: user 1 can insert own record');

select lives_ok($$insert into public.watchlist_items (id,user_id,stock_id,current_status_id) values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001')$$, 'watchlist_items: user 1 can insert own record');

select lives_ok($$insert into public.price_levels (id,user_id,stock_id,label,kind,value,currency,trigger_direction) values ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','M2','buy',10,'PLN','lte')$$, 'price_levels: user 1 can insert own record');

select lives_ok($$insert into public.notes (id,user_id,stock_id,content) values ('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','M2 note')$$, 'notes: user 1 can insert own record');

select lives_ok($$insert into public.monitoring_results (id,user_id,stock_id,status_definition_id,price,currency,price_as_of) values ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',10,'PLN',now())$$, 'monitoring_results: user 1 can insert own record');

select lives_ok($$insert into public.investment_theses (id,stock_id,monitoring_result_id,summary) values ('80000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','M2 thesis')$$, 'investment_theses: user 1 can insert own record');

select lives_ok($$insert into public.audit_events (id,user_id,entity_type,entity_id,action) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','60000000-0000-0000-0000-000000000001','created')$$, 'audit_events: user 1 can insert own record');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

select lives_ok($$insert into public.status_definitions (id,user_id,slug,label,color_token,dashboard_group) values ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','M2','M2','info','watch')$$, 'status_definitions: user 2 can insert own record');

select lives_ok($$insert into public.watchlist_items (id,user_id,stock_id,current_status_id) values ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002')$$, 'watchlist_items: user 2 can insert own record');

select lives_ok($$insert into public.price_levels (id,user_id,stock_id,label,kind,value,currency,trigger_direction) values ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','M2','buy',10,'PLN','lte')$$, 'price_levels: user 2 can insert own record');

select lives_ok($$insert into public.notes (id,user_id,stock_id,content) values ('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','M2 note')$$, 'notes: user 2 can insert own record');

select lives_ok($$insert into public.monitoring_results (id,user_id,stock_id,status_definition_id,price,currency,price_as_of) values ('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',10,'PLN',now())$$, 'monitoring_results: user 2 can insert own record');

select lives_ok($$insert into public.investment_theses (id,stock_id,monitoring_result_id,summary) values ('80000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002','M2 thesis')$$, 'investment_theses: user 2 can insert own record');

select lives_ok($$insert into public.audit_events (id,user_id,entity_type,entity_id,action) values ('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','note','60000000-0000-0000-0000-000000000002','created')$$, 'audit_events: user 2 can insert own record');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select is((select count(*)::int from public.status_definitions where id = '30000000-0000-0000-0000-000000000001'), 1, 'status_definitions: user 1 sees own row');

select is((select count(*)::int from public.status_definitions where id = '30000000-0000-0000-0000-000000000002'), 0, 'status_definitions: user 1 cannot see other row');

select is_empty($$update public.status_definitions set label = 'Changed' where id = '30000000-0000-0000-0000-000000000002' returning id$$, 'status_definitions: user 1 cannot change other row');

select isnt_empty($$update public.status_definitions set label = 'Changed' where id = '30000000-0000-0000-0000-000000000001' returning id$$, 'status_definitions: user 1 can update own row');

select throws_ok($$delete from public.status_definitions where id = '30000000-0000-0000-0000-000000000001'$$, '42501', null, 'status_definitions: user 1 cannot hard delete');

select throws_ok($$insert into public.status_definitions (id,user_id,slug,label,color_token,dashboard_group) values ('31000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','M2','M2','info','watch')$$, '42501', null, 'status_definitions: user 1 cannot forge ownership');

select throws_ok($$update public.status_definitions set user_id = '20000000-0000-0000-0000-000000000002' where id = '30000000-0000-0000-0000-000000000001'$$, '42501', null, 'status_definitions: user 1 cannot transfer ownership');

select is((select count(*)::int from public.watchlist_items where id = '40000000-0000-0000-0000-000000000001'), 1, 'watchlist_items: user 1 sees own row');

select is((select count(*)::int from public.watchlist_items where id = '40000000-0000-0000-0000-000000000002'), 0, 'watchlist_items: user 1 cannot see other row');

select is_empty($$update public.watchlist_items set archived_at = now() where id = '40000000-0000-0000-0000-000000000002' returning id$$, 'watchlist_items: user 1 cannot change other row');

select isnt_empty($$update public.watchlist_items set archived_at = now() where id = '40000000-0000-0000-0000-000000000001' returning id$$, 'watchlist_items: user 1 can update own row');

select throws_ok($$delete from public.watchlist_items where id = '40000000-0000-0000-0000-000000000001'$$, '42501', null, 'watchlist_items: user 1 cannot hard delete');

select throws_ok($$insert into public.watchlist_items (id,user_id,stock_id,current_status_id) values ('41000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001')$$, '42501', null, 'watchlist_items: user 1 cannot forge ownership');

select throws_ok($$update public.watchlist_items set user_id = '20000000-0000-0000-0000-000000000002' where id = '40000000-0000-0000-0000-000000000001'$$, '42501', null, 'watchlist_items: user 1 cannot transfer ownership');

select is((select count(*)::int from public.price_levels where id = '50000000-0000-0000-0000-000000000001'), 1, 'price_levels: user 1 sees own row');

select is((select count(*)::int from public.price_levels where id = '50000000-0000-0000-0000-000000000002'), 0, 'price_levels: user 1 cannot see other row');

select is_empty($$update public.price_levels set is_active = false where id = '50000000-0000-0000-0000-000000000002' returning id$$, 'price_levels: user 1 cannot change other row');

select isnt_empty($$update public.price_levels set is_active = false where id = '50000000-0000-0000-0000-000000000001' returning id$$, 'price_levels: user 1 can update own row');

select throws_ok($$delete from public.price_levels where id = '50000000-0000-0000-0000-000000000001'$$, '42501', null, 'price_levels: user 1 cannot hard delete');

select throws_ok($$insert into public.price_levels (id,user_id,stock_id,label,kind,value,currency,trigger_direction) values ('51000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','M2','buy',10,'PLN','lte')$$, '42501', null, 'price_levels: user 1 cannot forge ownership');

select throws_ok($$update public.price_levels set user_id = '20000000-0000-0000-0000-000000000002' where id = '50000000-0000-0000-0000-000000000001'$$, '42501', null, 'price_levels: user 1 cannot transfer ownership');

select is((select count(*)::int from public.notes where id = '60000000-0000-0000-0000-000000000001'), 1, 'notes: user 1 sees own row');

select is((select count(*)::int from public.notes where id = '60000000-0000-0000-0000-000000000002'), 0, 'notes: user 1 cannot see other row');

select is_empty($$update public.notes set content = 'Changed', is_pinned = true where id = '60000000-0000-0000-0000-000000000002' returning id$$, 'notes: user 1 cannot change other row');

select isnt_empty($$update public.notes set content = 'Changed', is_pinned = true where id = '60000000-0000-0000-0000-000000000001' returning id$$, 'notes: user 1 can update own row');

select throws_ok($$delete from public.notes where id = '60000000-0000-0000-0000-000000000001'$$, '42501', null, 'notes: user 1 cannot hard delete');

select throws_ok($$insert into public.notes (id,user_id,stock_id,content) values ('61000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','M2 note')$$, '42501', null, 'notes: user 1 cannot forge ownership');

select throws_ok($$update public.notes set user_id = '20000000-0000-0000-0000-000000000002' where id = '60000000-0000-0000-0000-000000000001'$$, '42501', null, 'notes: user 1 cannot transfer ownership');

select is((select count(*)::int from public.monitoring_results where id = '70000000-0000-0000-0000-000000000001'), 1, 'monitoring_results: user 1 sees own row');

select is((select count(*)::int from public.monitoring_results where id = '70000000-0000-0000-0000-000000000002'), 0, 'monitoring_results: user 1 cannot see other row');

select is_empty($$update public.monitoring_results set deleted_at = now() where id = '70000000-0000-0000-0000-000000000002' returning id$$, 'monitoring_results: user 1 cannot change other row');

select throws_ok($$delete from public.monitoring_results where id = '70000000-0000-0000-0000-000000000001'$$, '42501', null, 'monitoring_results: user 1 cannot hard delete');

select throws_ok($$insert into public.monitoring_results (id,user_id,stock_id,status_definition_id,price,currency,price_as_of) values ('71000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',10,'PLN',now())$$, '42501', null, 'monitoring_results: user 1 cannot forge ownership');

select is((select count(*)::int from public.investment_theses where id = '80000000-0000-0000-0000-000000000001'), 1, 'investment_theses: user 1 sees own row');

select is((select count(*)::int from public.investment_theses where id = '80000000-0000-0000-0000-000000000002'), 0, 'investment_theses: user 1 cannot see other row');

select throws_ok($$delete from public.investment_theses where id = '80000000-0000-0000-0000-000000000001'$$, '42501', null, 'investment_theses: user 1 cannot hard delete');

select is((select count(*)::int from public.audit_events where id = '10000000-0000-0000-0000-000000000001'), 1, 'audit_events: user 1 sees own row');

select is((select count(*)::int from public.audit_events where id = '10000000-0000-0000-0000-000000000002'), 0, 'audit_events: user 1 cannot see other row');

select throws_ok($$delete from public.audit_events where id = '10000000-0000-0000-0000-000000000001'$$, '42501', null, 'audit_events: user 1 cannot hard delete');

select throws_ok($$insert into public.audit_events (id,user_id,entity_type,entity_id,action) values ('11000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','note','60000000-0000-0000-0000-000000000001','created')$$, '42501', null, 'audit_events: user 1 cannot forge ownership');

select throws_ok($$update public.monitoring_results set summary = 'overwrite' where id = '70000000-0000-0000-0000-000000000001'$$, '42501', null, 'monitoring_results: user 1 cannot overwrite history');

select throws_ok($$update public.investment_theses set summary = 'overwrite' where id = '80000000-0000-0000-0000-000000000001'$$, '42501', null, 'investment_theses: user 1 cannot overwrite history');

select throws_ok($$update public.audit_events set action = 'overwrite' where id = '10000000-0000-0000-0000-000000000001'$$, '42501', null, 'audit_events: user 1 cannot overwrite history');

select lives_ok($$update public.monitoring_results set deleted_at = now() where id = '70000000-0000-0000-0000-000000000001'$$, 'monitoring: owner 1 can soft delete once');

select throws_ok($$update public.monitoring_results set deleted_at = null where id = '70000000-0000-0000-0000-000000000001'$$, '55000', null, 'monitoring: owner 1 cannot undo history soft delete');

select throws_ok($$insert into public.investment_theses(stock_id,monitoring_result_id) values ('90000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002')$$, '42501', null, 'thesis: owner 1 cannot attach to another user monitoring');

select throws_ok($$update public.watchlist_items set current_status_id = '30000000-0000-0000-0000-000000000002' where id = '40000000-0000-0000-0000-000000000001'$$, '23503', null, 'watchlist: owner 1 cannot reference another user status');

select throws_ok($$insert into public.monitoring_results(user_id,stock_id,status_definition_id,price,currency,price_as_of,supersedes_id) values ('20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',10,'PLN',now(),'70000000-0000-0000-0000-000000000002')$$, '23503', null, 'monitoring: owner 1 cannot supersede another user history');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

select is((select count(*)::int from public.status_definitions where id = '30000000-0000-0000-0000-000000000002'), 1, 'status_definitions: user 2 sees own row');

select is((select count(*)::int from public.status_definitions where id = '30000000-0000-0000-0000-000000000001'), 0, 'status_definitions: user 2 cannot see other row');

select is_empty($$update public.status_definitions set label = 'Changed' where id = '30000000-0000-0000-0000-000000000001' returning id$$, 'status_definitions: user 2 cannot change other row');

select isnt_empty($$update public.status_definitions set label = 'Changed' where id = '30000000-0000-0000-0000-000000000002' returning id$$, 'status_definitions: user 2 can update own row');

select throws_ok($$delete from public.status_definitions where id = '30000000-0000-0000-0000-000000000002'$$, '42501', null, 'status_definitions: user 2 cannot hard delete');

select throws_ok($$insert into public.status_definitions (id,user_id,slug,label,color_token,dashboard_group) values ('31000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','M2','M2','info','watch')$$, '42501', null, 'status_definitions: user 2 cannot forge ownership');

select throws_ok($$update public.status_definitions set user_id = '20000000-0000-0000-0000-000000000001' where id = '30000000-0000-0000-0000-000000000002'$$, '42501', null, 'status_definitions: user 2 cannot transfer ownership');

select is((select count(*)::int from public.watchlist_items where id = '40000000-0000-0000-0000-000000000002'), 1, 'watchlist_items: user 2 sees own row');

select is((select count(*)::int from public.watchlist_items where id = '40000000-0000-0000-0000-000000000001'), 0, 'watchlist_items: user 2 cannot see other row');

select is_empty($$update public.watchlist_items set archived_at = now() where id = '40000000-0000-0000-0000-000000000001' returning id$$, 'watchlist_items: user 2 cannot change other row');

select isnt_empty($$update public.watchlist_items set archived_at = now() where id = '40000000-0000-0000-0000-000000000002' returning id$$, 'watchlist_items: user 2 can update own row');

select throws_ok($$delete from public.watchlist_items where id = '40000000-0000-0000-0000-000000000002'$$, '42501', null, 'watchlist_items: user 2 cannot hard delete');

select throws_ok($$insert into public.watchlist_items (id,user_id,stock_id,current_status_id) values ('41000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002')$$, '42501', null, 'watchlist_items: user 2 cannot forge ownership');

select throws_ok($$update public.watchlist_items set user_id = '20000000-0000-0000-0000-000000000001' where id = '40000000-0000-0000-0000-000000000002'$$, '42501', null, 'watchlist_items: user 2 cannot transfer ownership');

select is((select count(*)::int from public.price_levels where id = '50000000-0000-0000-0000-000000000002'), 1, 'price_levels: user 2 sees own row');

select is((select count(*)::int from public.price_levels where id = '50000000-0000-0000-0000-000000000001'), 0, 'price_levels: user 2 cannot see other row');

select is_empty($$update public.price_levels set is_active = false where id = '50000000-0000-0000-0000-000000000001' returning id$$, 'price_levels: user 2 cannot change other row');

select isnt_empty($$update public.price_levels set is_active = false where id = '50000000-0000-0000-0000-000000000002' returning id$$, 'price_levels: user 2 can update own row');

select throws_ok($$delete from public.price_levels where id = '50000000-0000-0000-0000-000000000002'$$, '42501', null, 'price_levels: user 2 cannot hard delete');

select throws_ok($$insert into public.price_levels (id,user_id,stock_id,label,kind,value,currency,trigger_direction) values ('51000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','M2','buy',10,'PLN','lte')$$, '42501', null, 'price_levels: user 2 cannot forge ownership');

select throws_ok($$update public.price_levels set user_id = '20000000-0000-0000-0000-000000000001' where id = '50000000-0000-0000-0000-000000000002'$$, '42501', null, 'price_levels: user 2 cannot transfer ownership');

select is((select count(*)::int from public.notes where id = '60000000-0000-0000-0000-000000000002'), 1, 'notes: user 2 sees own row');

select is((select count(*)::int from public.notes where id = '60000000-0000-0000-0000-000000000001'), 0, 'notes: user 2 cannot see other row');

select is_empty($$update public.notes set content = 'Changed', is_pinned = true where id = '60000000-0000-0000-0000-000000000001' returning id$$, 'notes: user 2 cannot change other row');

select isnt_empty($$update public.notes set content = 'Changed', is_pinned = true where id = '60000000-0000-0000-0000-000000000002' returning id$$, 'notes: user 2 can update own row');

select throws_ok($$delete from public.notes where id = '60000000-0000-0000-0000-000000000002'$$, '42501', null, 'notes: user 2 cannot hard delete');

select throws_ok($$insert into public.notes (id,user_id,stock_id,content) values ('61000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','M2 note')$$, '42501', null, 'notes: user 2 cannot forge ownership');

select throws_ok($$update public.notes set user_id = '20000000-0000-0000-0000-000000000001' where id = '60000000-0000-0000-0000-000000000002'$$, '42501', null, 'notes: user 2 cannot transfer ownership');

select is((select count(*)::int from public.monitoring_results where id = '70000000-0000-0000-0000-000000000002'), 1, 'monitoring_results: user 2 sees own row');

select is((select count(*)::int from public.monitoring_results where id = '70000000-0000-0000-0000-000000000001'), 0, 'monitoring_results: user 2 cannot see other row');

select is_empty($$update public.monitoring_results set deleted_at = now() where id = '70000000-0000-0000-0000-000000000001' returning id$$, 'monitoring_results: user 2 cannot change other row');

select throws_ok($$delete from public.monitoring_results where id = '70000000-0000-0000-0000-000000000002'$$, '42501', null, 'monitoring_results: user 2 cannot hard delete');

select throws_ok($$insert into public.monitoring_results (id,user_id,stock_id,status_definition_id,price,currency,price_as_of) values ('71000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',10,'PLN',now())$$, '42501', null, 'monitoring_results: user 2 cannot forge ownership');

select is((select count(*)::int from public.investment_theses where id = '80000000-0000-0000-0000-000000000002'), 1, 'investment_theses: user 2 sees own row');

select is((select count(*)::int from public.investment_theses where id = '80000000-0000-0000-0000-000000000001'), 0, 'investment_theses: user 2 cannot see other row');

select throws_ok($$delete from public.investment_theses where id = '80000000-0000-0000-0000-000000000002'$$, '42501', null, 'investment_theses: user 2 cannot hard delete');

select is((select count(*)::int from public.audit_events where id = '10000000-0000-0000-0000-000000000002'), 1, 'audit_events: user 2 sees own row');

select is((select count(*)::int from public.audit_events where id = '10000000-0000-0000-0000-000000000001'), 0, 'audit_events: user 2 cannot see other row');

select throws_ok($$delete from public.audit_events where id = '10000000-0000-0000-0000-000000000002'$$, '42501', null, 'audit_events: user 2 cannot hard delete');

select throws_ok($$insert into public.audit_events (id,user_id,entity_type,entity_id,action) values ('11000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','note','60000000-0000-0000-0000-000000000002','created')$$, '42501', null, 'audit_events: user 2 cannot forge ownership');

select throws_ok($$update public.monitoring_results set summary = 'overwrite' where id = '70000000-0000-0000-0000-000000000002'$$, '42501', null, 'monitoring_results: user 2 cannot overwrite history');

select throws_ok($$update public.investment_theses set summary = 'overwrite' where id = '80000000-0000-0000-0000-000000000002'$$, '42501', null, 'investment_theses: user 2 cannot overwrite history');

select throws_ok($$update public.audit_events set action = 'overwrite' where id = '10000000-0000-0000-0000-000000000002'$$, '42501', null, 'audit_events: user 2 cannot overwrite history');

select lives_ok($$update public.monitoring_results set deleted_at = now() where id = '70000000-0000-0000-0000-000000000002'$$, 'monitoring: owner 2 can soft delete once');

select throws_ok($$update public.monitoring_results set deleted_at = null where id = '70000000-0000-0000-0000-000000000002'$$, '55000', null, 'monitoring: owner 2 cannot undo history soft delete');

select throws_ok($$insert into public.investment_theses(stock_id,monitoring_result_id) values ('90000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001')$$, '42501', null, 'thesis: owner 2 cannot attach to another user monitoring');

select throws_ok($$update public.watchlist_items set current_status_id = '30000000-0000-0000-0000-000000000001' where id = '40000000-0000-0000-0000-000000000002'$$, '23503', null, 'watchlist: owner 2 cannot reference another user status');

select throws_ok($$insert into public.monitoring_results(user_id,stock_id,status_definition_id,price,currency,price_as_of,supersedes_id) values ('20000000-0000-0000-0000-000000000002','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',10,'PLN',now(),'70000000-0000-0000-0000-000000000001')$$, '23503', null, 'monitoring: owner 2 cannot supersede another user history');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select lives_ok($$select * from public.markets$$, 'markets: authenticated read allowed');

select ok(not has_table_privilege('authenticated', 'public.markets', 'UPDATE'), 'markets: authenticated UPDATE denied');

select ok(not has_table_privilege('authenticated', 'public.markets', 'DELETE'), 'markets: authenticated DELETE denied');

select ok(not has_table_privilege('authenticated', 'public.markets', 'INSERT'), 'markets: authenticated INSERT denied');

select lives_ok($$select * from public.stocks$$, 'stocks: authenticated read allowed');

select ok(not has_table_privilege('authenticated', 'public.stocks', 'UPDATE'), 'stocks: authenticated UPDATE denied');

select ok(not has_table_privilege('authenticated', 'public.stocks', 'DELETE'), 'stocks: authenticated DELETE denied');

select lives_ok($$select * from public.stock_provider_symbols$$, 'stock_provider_symbols: authenticated read allowed');

select ok(not has_table_privilege('authenticated', 'public.stock_provider_symbols', 'UPDATE'), 'stock_provider_symbols: authenticated UPDATE denied');

select ok(not has_table_privilege('authenticated', 'public.stock_provider_symbols', 'DELETE'), 'stock_provider_symbols: authenticated DELETE denied');

select lives_ok($$select * from public.market_quotes$$, 'market_quotes: authenticated read allowed');

select ok(not has_table_privilege('authenticated', 'public.market_quotes', 'UPDATE'), 'market_quotes: authenticated UPDATE denied');

select ok(not has_table_privilege('authenticated', 'public.market_quotes', 'DELETE'), 'market_quotes: authenticated DELETE denied');

select ok(not has_table_privilege('authenticated', 'public.market_quotes', 'INSERT'), 'market_quotes: authenticated INSERT denied');

select lives_ok($$select * from public.stock_prices$$, 'stock_prices: authenticated read allowed');

select ok(not has_table_privilege('authenticated', 'public.stock_prices', 'UPDATE'), 'stock_prices: authenticated UPDATE denied');

select ok(not has_table_privilege('authenticated', 'public.stock_prices', 'DELETE'), 'stock_prices: authenticated DELETE denied');

select ok(not has_table_privilege('authenticated', 'public.stock_prices', 'INSERT'), 'stock_prices: authenticated INSERT denied');

select lives_ok($$select * from public.sync_runs$$, 'sync_runs: authenticated read allowed');

select ok(not has_table_privilege('authenticated', 'public.sync_runs', 'UPDATE'), 'sync_runs: authenticated UPDATE denied');

select ok(not has_table_privilege('authenticated', 'public.sync_runs', 'DELETE'), 'sync_runs: authenticated DELETE denied');

select ok(not has_table_privilege('authenticated', 'public.sync_runs', 'INSERT'), 'sync_runs: authenticated INSERT denied');

select lives_ok($$insert into public.stocks (id,market_id,ticker,name,exchange,currency,data_mode) select '90000000-0000-0000-0000-000000000002',id,'M2_ADD_FIXTURE','Manual instrument','XWAR','PLN','manual' from public.markets where code='GPW'$$, 'future Add Stock works with user JWT');

select lives_ok($$insert into public.stock_provider_symbols(stock_id,provider,provider_symbol) values ('90000000-0000-0000-0000-000000000002','fixture','M2_FIXTURE.WAR')$$, 'future provider mapping insert works with user JWT');

select throws_ok($$select public.initialize_default_statuses('20000000-0000-0000-0000-000000000001')$$, '42501', null, 'owner cannot invoke administrative bootstrap');

select ok(not has_function_privilege('authenticated', 'public.upsert_market_quote(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,character,timestamptz,timestamptz,text,text,text)', 'EXECUTE'), 'user cannot invoke quote writer');
reset role;
set local role anon;

select throws_ok($$select * from public.status_definitions$$, '42501', null, 'status_definitions: actual anonymous read denied');

select throws_ok($$insert into public.status_definitions (id,user_id,slug,label,color_token,dashboard_group) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','M2','M2','info','watch')$$, '42501', null, 'status_definitions: actual anonymous insert denied');

select throws_ok($$update public.status_definitions set id = id$$, '42501', null, 'status_definitions: actual anonymous update denied');

select throws_ok($$delete from public.status_definitions$$, '42501', null, 'status_definitions: actual anonymous delete denied');

select throws_ok($$select * from public.watchlist_items$$, '42501', null, 'watchlist_items: actual anonymous read denied');

select throws_ok($$insert into public.watchlist_items (id,user_id,stock_id,current_status_id) values ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001')$$, '42501', null, 'watchlist_items: actual anonymous insert denied');

select throws_ok($$update public.watchlist_items set id = id$$, '42501', null, 'watchlist_items: actual anonymous update denied');

select throws_ok($$delete from public.watchlist_items$$, '42501', null, 'watchlist_items: actual anonymous delete denied');

select throws_ok($$select * from public.price_levels$$, '42501', null, 'price_levels: actual anonymous read denied');

select throws_ok($$insert into public.price_levels (id,user_id,stock_id,label,kind,value,currency,trigger_direction) values ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','M2','buy',10,'PLN','lte')$$, '42501', null, 'price_levels: actual anonymous insert denied');

select throws_ok($$update public.price_levels set id = id$$, '42501', null, 'price_levels: actual anonymous update denied');

select throws_ok($$delete from public.price_levels$$, '42501', null, 'price_levels: actual anonymous delete denied');

select throws_ok($$select * from public.notes$$, '42501', null, 'notes: actual anonymous read denied');

select throws_ok($$insert into public.notes (id,user_id,stock_id,content) values ('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','M2 note')$$, '42501', null, 'notes: actual anonymous insert denied');

select throws_ok($$update public.notes set id = id$$, '42501', null, 'notes: actual anonymous update denied');

select throws_ok($$delete from public.notes$$, '42501', null, 'notes: actual anonymous delete denied');

select throws_ok($$select * from public.monitoring_results$$, '42501', null, 'monitoring_results: actual anonymous read denied');

select throws_ok($$insert into public.monitoring_results (id,user_id,stock_id,status_definition_id,price,currency,price_as_of) values ('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',10,'PLN',now())$$, '42501', null, 'monitoring_results: actual anonymous insert denied');

select throws_ok($$update public.monitoring_results set id = id$$, '42501', null, 'monitoring_results: actual anonymous update denied');

select throws_ok($$delete from public.monitoring_results$$, '42501', null, 'monitoring_results: actual anonymous delete denied');

select throws_ok($$select * from public.investment_theses$$, '42501', null, 'investment_theses: actual anonymous read denied');

select throws_ok($$insert into public.investment_theses (id,stock_id,monitoring_result_id,summary) values ('80000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','M2 thesis')$$, '42501', null, 'investment_theses: actual anonymous insert denied');

select throws_ok($$update public.investment_theses set id = id$$, '42501', null, 'investment_theses: actual anonymous update denied');

select throws_ok($$delete from public.investment_theses$$, '42501', null, 'investment_theses: actual anonymous delete denied');

select throws_ok($$select * from public.audit_events$$, '42501', null, 'audit_events: actual anonymous read denied');

select throws_ok($$insert into public.audit_events (id,user_id,entity_type,entity_id,action) values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','note','60000000-0000-0000-0000-000000000001','created')$$, '42501', null, 'audit_events: actual anonymous insert denied');

select throws_ok($$update public.audit_events set id = id$$, '42501', null, 'audit_events: actual anonymous update denied');

select throws_ok($$delete from public.audit_events$$, '42501', null, 'audit_events: actual anonymous delete denied');
reset role;
do $test_completion$
declare failure_report text;
begin
  select string_agg(result, E'\n') into failure_report from finish() as result;
  if failure_report is not null then raise exception '%', failure_report; end if;
end;
$test_completion$;
rollback;

