# ADR-002: Split EOD market-data providers by market

## Status

Accepted on 2026-09-11. The automated Stooq portion was superseded by
[ADR-003](ADR-003-manual-stooq-csv-import.md) on 2026-09-12; the Massive, NBP, storage, and mapping
decisions remain accepted.

## Context

The application needs daily prices for a private GPW + USA watchlist, not intraday or real-time
data. No practical free provider offers the required coverage for both markets under one stable
contract. Massive Basic covers USA EOD with a five-request-per-minute limit. Stooq covers GPW EOD
through a public CSV export without an API key, but automated clients may receive a browser-
verification page instead of CSV.

## Decision

- GPW EOD uses `StooqMarketDataProvider`.
- USA EOD uses `MassiveMarketDataProvider`.
- USD/PLN continues to use the independent official NBP adapter.
- Supabase PostgreSQL is the only market-data source read by UI routes.
- Provider mappings remain in `stock_provider_symbols`; provider symbols do not enter domain types.
- `stock_prices` stores one immutable row per stock, trading date, and provider.
- `market_quotes` advances only when an incoming `as_of` is strictly newer.
- Supabase Cron invokes the protected Next.js endpoint at 18:30 and 23:30 UTC on weekdays. The
  application decides which market and FX work is due.

The only market-provider secret is the server-only `MASSIVE_API_KEY`. A missing Massive key or an
unavailable Stooq CSV export degrades that market to stored/manual data without preventing reads.

## Consequences

- The application remains at zero monthly provider cost on the currently advertised personal
  plans, subject to provider terms and quotas.
- Two small adapters and mappings are maintained instead of one combined vendor adapter.
- Massive requests are sequential and spaced for the Basic five-calls-per-minute quota; a large
  watchlist may require another scheduled run after the serverless deadline.
- Stooq's public CSV export has no SLA and may challenge automated requests. ADR-003 removes that
  runtime dependency in favor of a local user-selected file; the application still keeps the last
  successful Supabase quote when no newer file is imported.
- The common adapter contract limits vendor lock-in and keeps provider payloads out of application
  and domain code.
