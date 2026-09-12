# Stock Monitor GPW + USA

Stock Monitor is a private, single-user investment research workspace for monitoring GPW and
US-listed companies. It preserves watchlist context, price freshness, price levels, monitoring
history, thesis revisions, and notes. It is not a trading platform or a real-time market terminal.

## Stack

- Next.js 16 App Router, React 19, and strict TypeScript
- Tailwind CSS 4 with CSS-variable design tokens
- Supabase PostgreSQL, Auth, RLS, and the supported SSR client package
- TanStack Table, React Hook Form, and Zod
- Vitest, Testing Library, Playwright, ESLint, and Prettier
- Vercel deployment with GitHub Actions verification

## Prerequisites

- Node.js 20.9 or newer (Node.js 22 is used in CI)
- pnpm 11 through Corepack
- Docker Desktop running for the local Supabase stack
- Supabase CLI 2.116.0 (the database scripts run the pinned CLI through `pnpm dlx`)

## Local development

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/login`. Anonymous requests for application pages are redirected to the
login form.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and supply values for the integration being
developed. Public Supabase values are separated from server-only credentials. GPW prices are loaded
from local Stooq CSV files selected by the user; the application never downloads them from Stooq.
The Massive key is optional so manual market-data mode remains possible.

Never commit real credentials. Server secrets must never use a `NEXT_PUBLIC_` prefix.

The required names are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_USER_EMAIL`, `MASSIVE_API_KEY`, `CRON_SECRET`, and `APP_URL`.
Auth requires the URL, anon key and allowlisted email. Server-only integration secrets
are validated when their later runtime paths use them. Local Supabase prints development-only URL
and key values after `pnpm db:start`.

## Authentication setup

1. In Supabase Dashboard, open **Authentication → Users**, choose **Add user**, and create the sole
   email/password account manually. Store its strong password outside the repository.
2. Under **Authentication → Sign In / Providers**, open the email provider and turn off **Allow new
   users to sign up**. Also keep anonymous sign-ins disabled. Local development sets the global
   `auth.enable_signup = false`; the email provider remains enabled so manually provisioned users
   can still sign in, while the unused phone provider remains disabled.
3. Set `ALLOWED_USER_EMAIL` to that exact account address in `.env.local` and in the deployment
   environment. Comparison is case-insensitive and is performed on the server after Supabase Auth
   confirms the current user.
4. Initialize the eight user-owned statuses with the SQL shown below, replacing the example email
   with the exact address of the manually provisioned Auth user.

There is no signup, invitation, password-reset or magic-link flow in the application. `proxy.ts`
uses the Next.js 16 request boundary to refresh Supabase SSR cookies and reject anonymous or
non-allowlisted traffic. Private Server Actions and data access code must additionally call
`requireAllowedUser()`; database grants and RLS remain the final authorization boundary.

## Local database

Start the local Supabase services and rebuild the database from migrations plus the seed:

```powershell
pnpm db:start
pnpm db:reset
```

`db:reset` applies every file in `supabase/migrations` in timestamp order and then runs
`supabase/seed.sql`. The seed is repeatable and creates the GPW and USA market records. Public
signup is disabled in `supabase/config.toml`; create the single allowed user manually through
Supabase Studio or the Auth admin API.

`db:reset` is destructive to local database data. Do not use it as a production migration command.

Default statuses cannot be seeded before that Auth user exists. After provisioning the user, run
this once in the SQL editor after replacing the example email (it is safe to repeat):

```sql
select public.initialize_default_statuses(id)
from auth.users
where lower(email) = lower('owner@example.com');
```

The query returns one row when it finds the account. Verify the result before continuing:

```sql
select count(*) as status_count
from public.status_definitions
where user_id = (
  select id
  from auth.users
  where lower(email) = lower('owner@example.com')
);
```

The expected count is `8`.

The initializer is restricted to database administration/service role; it is not an anonymous or
ordinary authenticated-user RPC.

Run both pgTAP database suites against the local stack and regenerate database types after every
schema change:

```powershell
pnpm db:test
pnpm db:types
```

Stop the local stack with `pnpm db:stop`.

Database tests use [pgTAP through Supabase CLI](https://supabase.com/docs/guides/local-development/testing/overview).
They run in a transaction and roll back their synthetic Auth and application data.

### Database decisions

- One durable `watchlist_items` row exists per `(user_id, stock_id)`, including archived rows;
  restore clears `archived_at` instead of inserting a duplicate.
- Foreign keys use `RESTRICT` to protect research history. No history table depends on a
  watchlist row. Status owner, correction owner/stock, and thesis stock relationships are checked
  with composite foreign keys.
- Monitoring contents and thesis revisions are immutable. Monitoring allows only a one-way
  `deleted_at` update; corrections insert a new record with `supersedes_id`. Notes are editable
  and their soft delete is reversible.
- RLS and explicit grants are active now. Shared reference/market data is authenticated-read and
  server-write; user-owned data uses owner policies. Normal users cannot hard-delete watchlist,
  monitoring, thesis, notes, or audit history.
- EOD quote writes store at most one `stock_prices` row per stock, session, and provider, then
  update `market_quotes` only when `as_of` is strictly newer.
- M4 uses the narrow `create_monitoring_with_thesis` RPC to insert the immutable monitoring
  snapshot, optionally insert its thesis revision, and update the current watchlist status in one
  transaction. The function derives ownership from `auth.uid()` and never accepts a client user ID.

On 2026-09-04, the M2 privilege migration was applied to `stock-monitor-dev`. The 229 M2 pgTAP
assertions passed remotely and their fixtures were rolled back. They cover anonymous denial,
cross-user isolation, ownership checks, reference-data permissions and append-only history. The
application deliberately continues to use mock business data until M3.

### Hosted development database (without local Docker)

Run these commands from the repository root. The approved development project is
`stock-monitor-dev` (`aasteufhkszuyatreetu`); do not target a production database for this test suite.

```powershell
pnpm dlx supabase@2.116.0 login
pnpm dlx supabase@2.116.0 link --project-ref aasteufhkszuyatreetu
pnpm dlx supabase@2.116.0 db push --linked --dry-run --include-seed --skip-vault
pnpm dlx supabase@2.116.0 db push --linked --include-seed --skip-vault
pnpm db:test:linked
pnpm db:types --linked
```

If PowerShell cannot find `pnpm`, replace it with
`& "C:\Program Files\nodejs\corepack.cmd" pnpm` in the commands above.

`db:test:linked` executes the foundation and Auth/RLS test files through the Management API. Each
test ends with ROLLBACK and raises a SQL error if pgTAP reports any failure or a plan mismatch,
because the API returns only the final result set. It does not use the Docker-based
`supabase test db` runner.
Never run `db reset --linked` as part of this workflow.

The local Auth settings in `config.toml` are not applied by `db push`. Disable public signup in
the hosted Auth settings before provisioning the allowed user in M2. No real Auth user or
user-owned default status records have been created by M1.

## Scripts

| Script                | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `pnpm dev`            | Start the local Next.js development server |
| `pnpm build`          | Create a production build                  |
| `pnpm start`          | Run the production build                   |
| `pnpm lint`           | Run ESLint                                 |
| `pnpm typecheck`      | Run TypeScript without emitting files      |
| `pnpm test`           | Run Vitest once                            |
| `pnpm test:watch`     | Run Vitest in watch mode                   |
| `pnpm test:e2e`       | Run the Playwright smoke test              |
| `pnpm test:e2e:local` | Provision a local user and run full E2E    |
| `pnpm provider:spike` | Run the development-only provider coverage diagnostic |
| `pnpm db:start`       | Start local Supabase                       |
| `pnpm db:stop`        | Stop local Supabase                        |
| `pnpm db:reset`       | Recreate, migrate, and seed the local DB   |
| `pnpm db:test`        | Run PostgreSQL/pgTAP tests                 |
| `pnpm db:types`       | Regenerate Supabase TypeScript DB types    |
| `pnpm format`         | Format supported files with Prettier       |
| `pnpm format:check`   | Check formatting without changing files    |

## Architecture

The repository is a modular monolith with this dependency direction:

```text
UI
  → Application / use cases
    → Domain
      ← Infrastructure adapters
```

- `src/app` and `src/components` contain presentation and framework boundaries.
- `src/application` contains orchestration and provider ports.
- `src/domain` contains provider- and framework-independent concepts and rules.
- `src/infrastructure` contains Supabase and, later, external provider adapters.
- `supabase` is reserved for SQL migrations and PostgreSQL/pgTAP tests.

Read [AGENTS.md](AGENTS.md), the
[product requirements](docs/PRD-Stock-Monitor-GPW-USA.md), and the
[technology recommendation](docs/Technology-Stack-Recommendation.md) before implementation work.

## Current implementation status

> M7 Automation and Operational Hardening is implemented on top of M1–M6.

`/dashboard` now reads authenticated PostgreSQL data through a bounded dashboard query model. It
shows market/status counts, deterministically ranked opportunities, stocks near an active buy
level, combined attention reasons, and the five latest non-superseded monitoring entries. The
dashboard never calls market-data providers and explicitly presents missing or stale stored data.

The dashboard monitoring summary is a `security_invoker` PostgreSQL view, so underlying RLS remains
authoritative. The application obtains the remaining dashboard inputs in bounded bulk queries and
uses the shared domain price-level calculations rather than duplicating trigger logic.

The active market-data path imports GPW EOD files downloaded manually from Stooq and retrieves USA
EOD prices from Massive Basic. Settings → Data associates each uploaded Stooq CSV with a selected
active GPW stock, validates and normalizes the file, then uses the same conditional quote upsert as
the Massive adapter. Manual stock and quote fallbacks remain available. Dashboard, Watchlist, and
Stock Detail read only stored Supabase data; page rendering never waits on an external market-data
provider.

The NBP adapter stores the latest official USD/PLN table A reference rate and prefills it for new
USD monitoring records. The field remains editable, and saved monitoring FX values stay immutable.
See [the provider coverage spike](docs/provider-spike.md) for the reproducible eight-symbol check.
Supabase Cron invokes the protected Next.js Node.js route at 18:30 and 23:30 UTC on weekdays.
These two DST-safe EOD windows cover USA and NBP; GPW is intentionally excluded because its source
is a local user-selected CSV file. The route runs the same USA quote and FX application use cases as manual refresh, while
one global advisory-guarded durable lease prevents overlap
between manual and scheduled work. Provider retries, batches, deadlines, partial outcomes, and crash
recovery are bounded and observable through `sync_runs` and Settings → Data.

Stooq requires no runtime connection or secret. Massive remains optional at application startup:
without it, research, GPW CSV import, and manual stock/price flows continue to work, while automatic
USA synchronization reports `provider_not_configured`. Required production values
are listed in `.env.example`; public values are limited to the Supabase URL and anonymous key. All
other credentials are server-only.

Use the [deployment runbook](docs/runbooks/deployment.md) for controlled production setup, the
[provider outage](docs/runbooks/provider-outage.md) and [cron failure](docs/runbooks/cron-failure.md)
procedures for recovery, and establish the weekly [backup/restore procedure](docs/runbooks/backup-restore.md)
before treating Supabase as the only copy of research history.
