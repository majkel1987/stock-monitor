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
- Settings → Data provides an authenticated import of one local Stooq CSV file, defaulting to
  all matching active GPW watchlist stocks. A selected-stock mode remains available for files
  without a ticker column.
- The importer accepts both per-symbol files using the standard daily columns
  `Date,Open,High,Low,Close,Volume` and bulk daily exports using
  `<TICKER>,<DATE>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>`. A bulk export is matched by ticker against
  the user's active GPW watchlist, or filtered to the selected stock in single-stock mode.
  The file is limited to 5 MB, and the Next.js
  Server Action request limit includes an additional 20 KB for multipart overhead.
- The latest row becomes the current quote. The preceding row supplies `previousClose` and the
  daily percentage change, preserving the former adapter semantics.
- Import targets are re-authorized on the server against the user's active GPW watchlist. File
  contents are validated and normalized before persistence and are not stored as raw payloads.
- Imports use the existing conditional EOD quote upsert and create a `stooq_csv_import` record in
  `sync_runs`. Older or equal quotes are idempotent skips.
- Bulk imports parse the file once, keep each stock's history separate, and persist each stock
  atomically through the existing RPC. Stocks missing from the file are skipped; future sessions
  and persistence failures are reported per stock while other valid stocks can be imported.
- The result reports updated quotes, unchanged quotes, missing stocks, failures and inserted
  historical rows. Repeating an import safely retries missing writes.
- Scheduled and manual network synchronization cover Massive USA EOD and NBP USD/PLN only.

## Consequences

- GPW freshness now depends on the user downloading and importing files after the session closes.
- Browser challenges, Stooq availability, and Stooq credentials no longer affect the application
  runtime.
- A per-symbol file must be associated with a selected GPW stock because it does not carry a ticker.
  A bulk file can update all matching observed GPW stocks in one submission.
- Stored research and the last known quote remain available when no new file is imported.
