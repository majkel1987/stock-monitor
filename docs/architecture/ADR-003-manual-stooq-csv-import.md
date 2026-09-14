# ADR-003: Import GPW EOD from a local Stooq CSV file

## Status

Accepted on 2026-09-12. This decision supersedes the automated Stooq portion of
[ADR-002](ADR-002-eod-market-data-providers.md).

## Context

Stooq's CSV export can present browser verification to automated clients and has no service-level
guarantee. The sole application user can download the daily CSV through a browser and wants to load
that local file into Stock Monitor instead of allowing the server to call Stooq directly.

## Decision

- The application runtime does not send HTTP requests to Stooq.
- Settings → Data provides an authenticated import for one selected active GPW stock and one local
  Stooq CSV file.
- The accepted file uses the standard daily columns `Date,Open,High,Low,Close,Volume` and is limited
  to 5 MB. The Next.js Server Action request limit includes an additional 20 KB for multipart
  overhead.
- The latest row becomes the current quote. The preceding row supplies `previousClose` and the
  daily percentage change, preserving the former adapter semantics.
- The selected stock is re-authorized on the server against the user's active GPW watchlist. File
  contents are validated and normalized before persistence and are not stored as raw payloads.
- Imports use the existing conditional EOD quote upsert and create a `stooq_csv_import` record in
  `sync_runs`. Older or equal quotes are idempotent skips.
- Scheduled and manual network synchronization cover Massive USA EOD and NBP USD/PLN only.

## Consequences

- GPW freshness now depends on the user downloading and importing files after the session closes.
- Browser challenges, Stooq availability, and Stooq credentials no longer affect the application
  runtime.
- A file must be associated with a selected GPW stock because the standard daily export does not
  carry the application's stock identity.
- Stored research and the last known quote remain available when no new file is imported.
