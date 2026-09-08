# Production deployment runbook

Production changes are reviewed on `main`. Database schema authority is `supabase/migrations`; do not
edit production tables or functions manually. The migration workflow is manually dispatched and
must be protected by GitHub's `production` environment approval.

## Initial deployment order

1. Create the Supabase production project and record its project reference in the secret manager.
2. Disable public signup in Auth. Do not create test stocks or users through `seed.sql`.
3. Configure GitHub environment secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and
   `SUPABASE_DB_PASSWORD`, then review and dispatch **Production database migrations** from `main`.
4. Manually provision the single production email/password user; store no password in Git.
5. From a privileged SQL session, call `public.initialize_default_statuses(<production-user-id>)`.
6. Connect the repository to Vercel and deploy `main` with Node 22/pnpm from the lockfile.
7. Configure Vercel Production environment variables:

   | Variable                        | Classification                                          |
   | ------------------------------- | ------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Public project URL                                      |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key; RLS remains mandatory             |
   | `SUPABASE_SERVICE_ROLE_KEY`     | Server-only                                             |
   | `ALLOWED_USER_EMAIL`            | Server-only access configuration                        |
   | `EODHD_API_TOKEN`               | Server-only; optional for manual-only mode              |
   | `CRON_SECRET`                   | Server-only, random, at least 32 characters             |
   | `APP_URL`                       | Server configuration; canonical HTTPS production origin |

8. Redeploy after environment changes. Preview deployments must not receive production cron traffic.
9. In Supabase Vault, create/update `stock_monitor_app_url` and `stock_monitor_cron_secret` through
   the dashboard or another approved secret-input path. Do not paste the values into committed SQL
   or examples.
10. From a privileged SQL session call `public.configure_market_sync_cron()`. This creates one
    production-only weekday job using `pg_cron` and `pg_net`; no Edge Function is involved.

The database-side HTTP timeout is 270 seconds. The application stops accepting new provider work
after 240 seconds, leaving time to persist the terminal `sync_runs` state before the request ends.

## Smoke tests

Verify `/api/health` returns only `{"status":"ok"}`. Then verify login, dashboard, one Stock Detail,
manual refresh, and recent `sync_runs`. Perform one scheduled endpoint invocation using a secret read
interactively from the operator's secret manager (not a literal in command history). Confirm the
response is small, an orchestrator run exists, counts are plausible, and a newer provider quote is
stored when one is available.

Inspect Vercel logs, Supabase Cron history, and `pg_net` response records. Record the deployment
commit and smoke-test result. Configure the weekly off-site backup procedure separately.

## Rollback

Pause cron first if the failure can mutate data. Roll back the Vercel deployment through the Vercel
dashboard. Database migrations require an explicitly reviewed forward-fix migration; do not use a
destructive reset on production.
