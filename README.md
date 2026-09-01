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
- A Supabase project is required only when authentication and persistence are implemented
- Supabase CLI will be required for the later local database workflow

## Local development

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The root route redirects to the placeholder dashboard.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and supply values for the integration being
developed. Public Supabase values are separated from server-only credentials. The EODHD token is
optional so manual market-data mode remains possible.

Never commit real credentials. Server secrets must never use a `NEXT_PUBLIC_` prefix.

## Scripts

| Script              | Purpose                                    |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Start the local Next.js development server |
| `pnpm build`        | Create a production build                  |
| `pnpm start`        | Run the production build                   |
| `pnpm lint`         | Run ESLint                                 |
| `pnpm typecheck`    | Run TypeScript without emitting files      |
| `pnpm test`         | Run Vitest once                            |
| `pnpm test:watch`   | Run Vitest in watch mode                   |
| `pnpm test:e2e`     | Run the Playwright smoke test              |
| `pnpm format`       | Format supported files with Prettier       |
| `pnpm format:check` | Check formatting without changing files    |

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

> Project scaffold complete. Business features and database schema not yet implemented.

The current routes and internal synchronization endpoint are safe placeholders. The next step is
the static UI mockup using mock data; production database access and provider calls remain out of
scope.
