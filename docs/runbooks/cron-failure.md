# Cron failure runbook

Start with Supabase Cron history, `net._http_response`, recent `sync_runs`, Supabase database logs,
and Vercel logs. Correlate application logs by `runId`; do not expose the bearer secret.

| Symptom          | Checks                                                            | Recovery                                                                         |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| No invocation    | `cron.job` active row, `cron.job_run_details`, project not paused | Restore Vault values and call `configure_market_sync_cron()`                     |
| HTTP 401         | Vault secret and Vercel `CRON_SECRET` differ                      | Rotate both values, then perform one smoke invocation                            |
| HTTP 503         | Vercel server configuration is incomplete                         | Set valid `CRON_SECRET`, `APP_URL`, service role, and allowed owner email        |
| `pg_net` failure | `net._http_response`, DNS/TLS, HTTPS production URL               | Correct `stock_monitor_app_url`; keep HTTPS                                      |
| Endpoint 500     | Vercel log by `runId`, latest failed `sync_runs`                  | Resolve configuration/code/provider cause and retry once                         |
| Appears locked   | Active orchestrator row age and `metadata`                        | Wait for active work; a claim after five minutes marks a crashed lease abandoned |
| Provider failure | Child run status and provider category                            | Follow the provider-outage runbook; manual quotes remain available               |

To pause production scheduling, run `select public.disable_market_sync_cron();` from a privileged SQL
session. To restore it after Vault is valid, run `select public.configure_market_sync_cron();`.
Every scheduled HTTP attempt should create an orchestrator `sync_runs` row unless the request was
rejected before application execution (for example HTTP 401).
