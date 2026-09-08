# Market-data provider outage runbook

## Identify and contain

1. Open Settings → Data and inspect the latest attempt, market/FX success timestamps, failure
   summary, counts, and provider configuration state.
2. Query recent `sync_runs` in Supabase and correlate its `id` with `runId` in Vercel logs.
3. Classify the failure: EODHD 401/403 configuration, 429 throttling, 5xx/network outage, missing
   mapping, NBP failure, or an internal error. Do not copy tokens or raw provider payloads into logs.
4. Avoid repeated manual refreshes during a known outage. The automatic process already uses bounded
   attempts; disable cron only if repeated invocations create operational harm.

## Continue safely

Stored quotes and all historical monitoring, thesis, price levels, and notes remain readable.
Provider errors never delete these records. Use **Set price** on Stock Detail for a manual quote;
record its source/time accurately. Missing provider mappings remain manual-only until corrected.

## Resume

1. Correct credentials or wait for provider recovery/rate-limit reset.
2. Run one authenticated manual refresh or one secured scheduled smoke invocation.
3. Confirm a terminal `sync_runs` status, sensible requested/success/failure counts, and newer quotes.
4. Re-enable the cron with `public.configure_market_sync_cron()` if it was disabled.
5. Confirm the next ordinary scheduled attempt. Old/equal quotes being skipped is expected.

Never rewrite historical monitoring records to match a recovered live quote.
