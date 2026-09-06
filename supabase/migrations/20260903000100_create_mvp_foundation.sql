create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create table public.markets (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null,
  name text not null,
  currency character(3) not null,
  timezone text not null,
  mic_codes text[] not null default '{}',
  constraint markets_code_key unique (code),
  constraint markets_code_check check (code ~ '^[A-Z][A-Z0-9_]*$'),
  constraint markets_name_check check (btrim(name) <> ''),
  constraint markets_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint markets_timezone_check check (btrim(timezone) <> '')
);

create table public.stocks (
  id uuid primary key default extensions.gen_random_uuid(),
  market_id uuid not null,
  ticker extensions.citext not null,
  name text not null,
  exchange text not null,
  currency character(3) not null,
  isin text,
  data_mode text not null default 'provider',
  metadata_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stocks_market_id_fkey foreign key (market_id)
    references public.markets (id) on delete restrict,
  constraint stocks_market_id_ticker_key unique (market_id, ticker),
  constraint stocks_ticker_check check (
    ticker::text <> '' and ticker::text = btrim(ticker::text)
  ),
  constraint stocks_name_check check (btrim(name) <> ''),
  constraint stocks_exchange_check check (btrim(exchange) <> ''),
  constraint stocks_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint stocks_isin_check check (isin is null or isin ~ '^[A-Z0-9]{12}$'),
  constraint stocks_data_mode_check check (data_mode in ('provider', 'manual'))
);

create table public.stock_provider_symbols (
  id uuid primary key default extensions.gen_random_uuid(),
  stock_id uuid not null,
  provider text not null,
  provider_symbol text not null,
  is_primary boolean not null default false,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_provider_symbols_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint stock_provider_symbols_provider_symbol_key unique (provider, provider_symbol),
  constraint stock_provider_symbols_provider_check check (btrim(provider) <> ''),
  constraint stock_provider_symbols_symbol_check check (btrim(provider_symbol) <> ''),
  constraint stock_provider_symbols_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create table public.status_definitions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  slug text not null,
  label text not null,
  description text,
  color_token text not null,
  dashboard_group text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint status_definitions_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint status_definitions_user_id_slug_key unique (user_id, slug),
  constraint status_definitions_id_user_id_key unique (id, user_id),
  constraint status_definitions_slug_check check (btrim(slug) <> ''),
  constraint status_definitions_label_check check (btrim(label) <> ''),
  constraint status_definitions_color_token_check check (btrim(color_token) <> ''),
  constraint status_definitions_dashboard_group_check check (
    dashboard_group in ('opportunity', 'watch', 'research', 'portfolio', 'negative', 'other')
  )
);

create table public.watchlist_items (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  stock_id uuid not null,
  current_status_id uuid not null,
  added_at timestamptz not null default now(),
  archived_at timestamptz,
  display_order integer,
  target_review_at timestamptz,
  constraint watchlist_items_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint watchlist_items_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint watchlist_items_status_owner_fkey foreign key (current_status_id, user_id)
    references public.status_definitions (id, user_id) on delete restrict,
  constraint watchlist_items_user_id_stock_id_key unique (user_id, stock_id)
);

create table public.market_quotes (
  stock_id uuid primary key,
  price numeric(20, 6) not null,
  previous_close numeric(20, 6),
  day_change_pct numeric(12, 6),
  market_cap numeric(30, 6),
  volume numeric(30, 6),
  fifty_two_week_high numeric(20, 6),
  fifty_two_week_low numeric(20, 6),
  currency character(3) not null,
  as_of timestamptz not null,
  received_at timestamptz not null default now(),
  provider text not null,
  raw_hash text,
  quality_status text not null,
  constraint market_quotes_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint market_quotes_price_check check (price > 0),
  constraint market_quotes_previous_close_check check (previous_close is null or previous_close > 0),
  constraint market_quotes_market_cap_check check (market_cap is null or market_cap >= 0),
  constraint market_quotes_volume_check check (volume is null or volume >= 0),
  constraint market_quotes_52w_high_check check (fifty_two_week_high is null or fifty_two_week_high > 0),
  constraint market_quotes_52w_low_check check (fifty_two_week_low is null or fifty_two_week_low > 0),
  constraint market_quotes_52w_range_check check (
    fifty_two_week_high is null
    or fifty_two_week_low is null
    or fifty_two_week_high >= fifty_two_week_low
  ),
  constraint market_quotes_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint market_quotes_provider_check check (btrim(provider) <> ''),
  constraint market_quotes_quality_status_check check (btrim(quality_status) <> '')
);

create table public.stock_prices (
  id uuid primary key default extensions.gen_random_uuid(),
  stock_id uuid not null,
  trading_date date not null,
  open numeric(20, 6),
  high numeric(20, 6),
  low numeric(20, 6),
  close numeric(20, 6) not null,
  adjusted_close numeric(20, 6),
  volume numeric(30, 6),
  currency character(3) not null,
  provider text not null,
  created_at timestamptz not null default now(),
  constraint stock_prices_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint stock_prices_stock_date_provider_key unique (stock_id, trading_date, provider),
  constraint stock_prices_open_check check (open is null or open > 0),
  constraint stock_prices_high_check check (high is null or high > 0),
  constraint stock_prices_low_check check (low is null or low > 0),
  constraint stock_prices_close_check check (close > 0),
  constraint stock_prices_adjusted_close_check check (adjusted_close is null or adjusted_close > 0),
  constraint stock_prices_volume_check check (volume is null or volume >= 0),
  constraint stock_prices_range_check check (high is null or low is null or high >= low),
  constraint stock_prices_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint stock_prices_provider_check check (btrim(provider) <> '')
);

create table public.price_levels (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  stock_id uuid not null,
  label text not null,
  kind text not null,
  value numeric(20, 6) not null,
  currency character(3) not null,
  trigger_direction text not null,
  priority integer,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_levels_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint price_levels_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint price_levels_label_check check (btrim(label) <> ''),
  constraint price_levels_kind_check check (kind in ('buy', 'fair_value', 'sell', 'custom')),
  constraint price_levels_value_check check (value > 0),
  constraint price_levels_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint price_levels_trigger_direction_check check (trigger_direction in ('lte', 'gte')),
  constraint price_levels_valid_range_check check (
    valid_to is null or valid_from is null or valid_to >= valid_from
  )
);

create table public.monitoring_results (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  stock_id uuid not null,
  status_definition_id uuid not null,
  analyzed_at timestamptz not null default now(),
  investment_score smallint,
  quality_score smallint,
  valuation_score smallint,
  momentum_score smallint,
  risk_score smallint,
  recommendation text,
  summary text,
  pros jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  price numeric(20, 6) not null,
  currency character(3) not null,
  price_as_of timestamptz not null,
  fx_usd_pln numeric(12, 6),
  price_pln numeric(20, 6),
  source_type text not null default 'manual',
  source_reference text,
  supersedes_id uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint monitoring_results_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint monitoring_results_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint monitoring_results_status_owner_fkey foreign key (status_definition_id, user_id)
    references public.status_definitions (id, user_id) on delete restrict,
  constraint monitoring_results_id_user_stock_key unique (id, user_id, stock_id),
  constraint monitoring_results_id_stock_key unique (id, stock_id),
  constraint monitoring_results_supersedes_fkey foreign key (supersedes_id, user_id, stock_id)
    references public.monitoring_results (id, user_id, stock_id) on delete restrict,
  constraint monitoring_results_not_self_superseding_check check (
    supersedes_id is null or supersedes_id <> id
  ),
  constraint monitoring_results_investment_score_check check (
    investment_score is null or investment_score between 0 and 100
  ),
  constraint monitoring_results_quality_score_check check (
    quality_score is null or quality_score between 0 and 100
  ),
  constraint monitoring_results_valuation_score_check check (
    valuation_score is null or valuation_score between 0 and 100
  ),
  constraint monitoring_results_momentum_score_check check (
    momentum_score is null or momentum_score between 0 and 100
  ),
  constraint monitoring_results_risk_score_check check (
    risk_score is null or risk_score between 0 and 100
  ),
  constraint monitoring_results_pros_check check (jsonb_typeof(pros) = 'array'),
  constraint monitoring_results_risks_check check (jsonb_typeof(risks) = 'array'),
  constraint monitoring_results_price_check check (price > 0),
  constraint monitoring_results_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint monitoring_results_fx_check check (fx_usd_pln is null or fx_usd_pln > 0),
  constraint monitoring_results_price_pln_check check (price_pln is null or price_pln > 0),
  constraint monitoring_results_fx_snapshot_check check (
    (fx_usd_pln is null and price_pln is null)
    or (fx_usd_pln is not null and price_pln is not null)
  ),
  constraint monitoring_results_source_type_check check (
    source_type in ('manual', 'json_import', 'api_import')
  )
);

create table public.investment_theses (
  id uuid primary key default extensions.gen_random_uuid(),
  stock_id uuid not null,
  monitoring_result_id uuid not null,
  summary text,
  bull_case text,
  base_case text,
  bear_case text,
  catalysts jsonb not null default '[]'::jsonb,
  key_risks jsonb not null default '[]'::jsonb,
  kill_criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint investment_theses_monitoring_result_id_key unique (monitoring_result_id),
  constraint investment_theses_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint investment_theses_monitoring_stock_fkey foreign key (monitoring_result_id, stock_id)
    references public.monitoring_results (id, stock_id) on delete restrict,
  constraint investment_theses_catalysts_check check (jsonb_typeof(catalysts) = 'array'),
  constraint investment_theses_key_risks_check check (jsonb_typeof(key_risks) = 'array'),
  constraint investment_theses_kill_criteria_check check (jsonb_typeof(kill_criteria) = 'array')
);

create table public.notes (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  stock_id uuid not null,
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notes_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint notes_stock_id_fkey foreign key (stock_id)
    references public.stocks (id) on delete restrict,
  constraint notes_content_length_check check (char_length(content) between 1 and 10000)
);

create table public.sync_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  job_type text not null,
  provider text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  requested_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  constraint sync_runs_job_type_check check (btrim(job_type) <> ''),
  constraint sync_runs_provider_check check (btrim(provider) <> ''),
  constraint sync_runs_status_check check (
    status in ('running', 'success', 'partial', 'failed', 'skipped')
  ),
  constraint sync_runs_counts_check check (
    requested_count >= 0
    and success_count >= 0
    and failure_count >= 0
    and success_count + failure_count <= requested_count
  ),
  constraint sync_runs_time_range_check check (finished_at is null or finished_at >= started_at),
  constraint sync_runs_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create table public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete restrict,
  constraint audit_events_entity_type_check check (btrim(entity_type) <> ''),
  constraint audit_events_action_check check (btrim(action) <> '')
);
