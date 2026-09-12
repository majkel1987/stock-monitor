# ADR-001: Scheduled synchronization ownership and overlap protection

## Status

Superseded by [ADR-002](ADR-002-eod-market-data-providers.md) for schedule frequency; the lease and
overlap-protection decision remains accepted.

## Context

The application runs on Vercel Node.js while Supabase Cron initiates synchronization. A PostgreSQL
session advisory lock cannot safely remain held across several PostgREST requests made by a
serverless function. Manual and scheduled refreshes must still share one exclusion boundary.

Market opening hours also span Warsaw and New York time zones. A fixed UTC cron tied to a single
exchange would drift during DST transitions.

## Decision

Supabase Cron runs every 30 minutes during a broad weekday UTC window (`06:00–23:59 UTC`). The
application use case decides whether GPW, USA, and the daily NBP rate are due using each market's
IANA time zone.

`claim_market_sync` takes a transaction-scoped advisory lock only while atomically claiming a
durable global lease represented by a `running` orchestrator row in `sync_runs`. A partial unique
index permits only one active `scheduled_market_sync` or `manual_market_sync` row. Every rejected
automatic attempt is recorded as `skipped`. A later claimant converts a lease older than five
minutes to `failed` with `metadata.abandoned = true` before claiming new work.

The protected Next.js route and the authenticated manual action invoke the same quote and FX use
cases. Provider calls remain outside a database transaction; the durable row is the cross-request
lease.

## Consequences

- Scheduled and manual provider calls cannot overlap.
- A crashed serverless invocation does not block synchronization permanently.
- The broad cron window is DST-safe without changing the cron expression.
- Exchange holidays are not modeled in MVP; harmless scheduled checks can be skipped by quote
  ordering and freshness rules.
- The database row, rather than a long-lived PostgreSQL session, is the durable lock state.
