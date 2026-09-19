# AGENTS.md — Stock Monitor GPW + USA

## 1. Purpose

This file defines the permanent engineering rules for the **Stock Monitor GPW + USA** project.

Every coding agent MUST read this file before starting any implementation task.

This document is authoritative for:

- architecture boundaries,
- technology choices,
- repository conventions,
- coding rules,
- testing expectations,
- security constraints,
- MVP scope discipline.

If a task conflicts with this file, do not silently ignore the conflict. Follow the higher-priority project source documents and clearly report the inconsistency.

---

## 2. Required source documents

Before implementing any non-trivial feature, inspect the relevant project documentation.

Primary sources of truth:

1. `docs/PRD-Stock-Monitor-GPW-USA.md` — functional/product requirements.
2. `docs/Technology-Stack-Recommendation.md` — approved technology and runtime architecture.
3. Entity Architecture documentation / reference — domain/data model.
4. Visual Architecture documentation / reference — intended screen structure and product concepts.
5. Pencil / Pen.dev design — optional visual reference when explicitly requested; see Section 3.
6. Existing ADRs under `docs/architecture/` — recorded architectural decisions.

Use the following authority model:

```text
FUNCTIONAL REQUIREMENTS
→ PRD

DOMAIN / DATA MODEL
→ Entity Architecture + PRD

TECHNICAL ARCHITECTURE
→ Technology Stack Recommendation + AGENTS.md + ADRs

SCREEN STRUCTURE / PRODUCT CONCEPTS
→ Visual Architecture

FINAL VISUAL UI / UX
→ explicit user requirements + current React implementation
→ Pencil / Pen.dev only when explicitly requested

IMPLEMENTATION
→ Next.js repository
```

Do not invent requirements that are absent from the project documentation.

Do not implement V1/V2 functionality as part of MVP unless explicitly requested.

---

## 3. Pencil / Pen.dev — Optional Visual Reference

An optional UI/UX reference for this application is stored in:

```text
C:\Users\Michał\Documents\ChatGPT\Stock_Monitor\StockMonitor.pen
```

The Pencil / Pen.dev MCP integration may be used when the user explicitly asks to implement, compare, or synchronize a design from the `.pen` file.

The `.pen` file is not a mandatory dependency for ordinary frontend or backend work.

The existing React implementation and explicit task requirements govern ordinary visual changes. Visual Architecture remains a reference for intended screen structure, user flows and product concepts.

### Design authority when Pencil is explicitly in scope

When a task explicitly requests alignment with Pencil, use this direction:

```text
StockMonitor.pen
        ↓
React / Next.js implementation
```

### Pencil usage is opt-in

Do not inspect Pencil automatically for every UI-affecting task.

Use Pencil only when:

- the user explicitly asks to implement or compare against `StockMonitor.pen`;
- a task explicitly names a Pencil frame/component as its acceptance reference;
- the user asks to edit the `.pen` design itself.

Pencil availability must never block backend work. It also must not block ordinary frontend work that is based on explicit requirements, the existing React implementation, or another supplied visual reference.

When Pencil is explicitly in scope and unavailable, report that the requested Pencil comparison could not be performed, but continue any independent work that remains safe and well-defined.

### UI implementation workflow

For substantial UI implementation tasks:

1. Read `AGENTS.md`.
2. Identify the relevant route, screen, frame or component.
3. Inspect the existing React/Next.js implementation and shared design tokens.
4. Implement the smallest required change.
5. Render the application at the corresponding viewport when tooling permits.
6. Correct meaningful visual or interaction regressions.
7. Run the relevant quality checks.

If Pencil was explicitly requested, add Pencil inspection and comparison to this workflow.

### Fidelity rules

Do NOT:

- redesign approved screens,
- "improve" the visual design without being asked,
- modernize or simplify the approved layout,
- replace intentional product layouts with generic shadcn patterns,
- change typography because another font or scale seems preferable,
- change spacing because another value looks cleaner,
- change component proportions,
- change colors without a design requirement,
- change border radius without a design requirement,
- replace tables with cards,
- reduce information density,
- introduce generic SaaS dashboard patterns,
- add decorative gradients, glass effects or visual noise,
- invent a different interaction pattern when one is already defined in the current product or task requirements.

When Pencil is explicitly in scope and exact values can be read from it, use measured values instead of guessing.

When a visual reference is explicitly supplied, fidelity should be as close to 1:1 as technically reasonable while preserving semantic HTML, accessibility and the approved technical architecture.

### Referenced design components → React components

When implementing from Pencil or another explicit design reference, reusable design components should normally map to reusable React components where the conceptual boundary is meaningful.

Preferred relationship:

```text
Referenced reusable component
        ↓
React reusable component
```

Typical examples:

```text
App Sidebar
→ AppSidebar

Navigation Item
→ NavigationItem

Status Badge
→ StatusBadge

Price Display
→ PriceDisplay

Financial Table
→ reusable table primitives

Monitoring Dialog / Sheet
→ reusable monitoring UI component
```

Do not independently recreate the same product component on multiple pages.

Do not over-componentize trivial wrappers, labels or one-off layout frames.

### Design variables → application design tokens

Existing application tokens are the default source for visual styling. When Pencil is explicitly in scope, its variables may be mapped to application design tokens.

Where practical, map them to shared CSS custom properties and consume them through Tailwind/component styling.

Conceptual mapping:

```text
Design variable
        ↓
CSS custom property
        ↓
Tailwind / component styling
```

Prefer shared semantic tokens such as:

```text
--background
--surface
--surface-muted
--border
--foreground
--muted-foreground
--accent
--positive
--negative
--warning
--focus
```

over duplicated hard-coded values scattered through React components.

When a shared visual token changes, update the shared token/component first where appropriate instead of patching individual screens independently.

### Visual verification

For substantial UI changes, verify at minimum:

- overall frame geometry,
- sidebar width,
- top-bar height,
- page/content padding,
- section positions,
- component widths and heights,
- table column widths,
- table row heights,
- gaps,
- alignment,
- typography,
- font weight,
- line height,
- colors,
- borders,
- border radius,
- icon size,
- button dimensions,
- input dimensions,
- dialog/sheet dimensions,
- numeric alignment and formatting.

When a task supplies exact visual values, prefer them over inferred or approximate values.

### Conflict handling

If an explicitly requested Pencil design conflicts with another project source:

- visual appearance for that task is governed by the explicit user request and referenced Pencil frame;
- business behavior is governed by the PRD/domain model;
- data shape and relationships are governed by Entity Architecture/PRD;
- technical boundaries are governed by `AGENTS.md`, Technology Stack Recommendation and ADRs.

Do not silently choose one interpretation when the sources materially conflict.

Report the conflict before implementing the conflicting behavior.

### Pencil source is read-only by default

For ordinary implementation tasks, treat:

```text
C:\Users\Michał\Documents\ChatGPT\Stock_Monitor\StockMonitor.pen
```

as read-only.

Do not modify the Pencil design merely to make implementation easier.

Only modify the `.pen` file when the user explicitly requests a design change.

---

## 4. Product context

Stock Monitor is a private, single-user investment research application for monitoring GPW and US-listed companies.

Core MVP responsibilities include:

- private authentication,
- GPW + USA watchlist,
- configurable statuses,
- delayed/manual market prices,
- price freshness,
- price levels,
- monitoring history,
- immutable investment analysis history,
- manual JSON import of `Monitoruj GPW Okazje` schema `1.0` through draft, review and selective commit,
- thesis revisions,
- notes,
- dashboard aggregations,
- Stooq GPW EOD and Massive USA EOD market-data integrations,
- NBP USD/PLN integration,
- periodic price synchronization,
- manual fallback when provider data is unavailable.

This is NOT:

- a trading platform,
- a broker integration,
- a real-time terminal,
- a social application,
- a multi-tenant SaaS,
- a portfolio accounting platform,
- an AI orchestration platform in MVP.

---

## 5. Architecture contract

Use a **modular monolith**.

Required dependency direction:

```text
UI
  -> Application / Use Cases
    -> Domain
      <- Infrastructure adapters implement ports required by Application/Domain
```

### Hard rules

- Domain code MUST NOT import:
  - Next.js,
  - Supabase SDK,
  - provider SDKs,
  - UI libraries.
- Infrastructure MAY depend on domain/application contracts.
- UI MAY call application services/use cases.
- Do not duplicate business logic between Server Actions and Route Handlers.
- Do not create abstraction layers without a concrete reason.
- Do not create generic repositories for every table.
- Prefer feature-specific query modules and small provider ports.

---

## 6. Approved technology stack

### Frontend / application

Use:

- Next.js 16 App Router,
- React 19,
- TypeScript in strict mode,
- Tailwind CSS 4,
- CSS variables for design tokens,
- selective shadcn/ui components,
- Radix primitives where useful,
- TanStack Table,
- React Hook Form only for complex forms,
- Zod for TypeScript boundaries.

### Backend

Use:

- React Server Components for normal reads,
- Server Actions for authenticated first-party UI mutations,
- Route Handlers only for:
  - scheduled/internal HTTP endpoints,
  - provider-facing boundaries where HTTP is required,
  - future versioned external APIs,
  - safe health endpoints.

Do NOT reproduce every Server Action as a REST endpoint.

### Persistence

Use:

- Supabase PostgreSQL,
- SQL migrations as the schema authority,
- generated Supabase TypeScript database types,
- RLS,
- explicit grants,
- PostgreSQL constraints,
- SQL views/functions where appropriate,
- narrow RPC functions only for atomic multi-table operations.

Do NOT introduce an ORM.

---

## 7. Runtime rules

The MVP uses ONE application runtime:

**Vercel Node.js**

Do NOT deploy application business logic to Supabase Edge Functions.

Scheduled synchronization:

```text
Supabase Cron / pg_cron
  -> pg_net signed HTTPS request
    -> protected Next.js Route Handler on Vercel
      -> application use case
        -> provider adapter
        -> PostgreSQL
```

Use:

- advisory locks,
- `sync_runs`,
- bounded provider batches,
- idempotent writes,
- conditional quote upserts by `as_of`,
- partial-success reporting.

Do NOT use Vercel Cron for the MVP EOD synchronization.

---

## 8. Authentication and authorization

Use:

- Supabase Auth,
- one manually provisioned email/password account,
- public registration disabled,
- supported SSR cookie/session integration,
- RLS on all exposed user-owned data,
- explicit database grants.

Every server entry point must authenticate independently.

Never treat a hidden button or route layout as authorization.

Normal user operations:

- use the authenticated user session/JWT,
- pass through RLS.

Service role:

- server-only,
- never exposed to browser code,
- never prefixed with `NEXT_PUBLIC_`,
- restricted to synchronization/admin infrastructure,
- never logged.

Do not implement:

- organizations,
- invitations,
- team roles,
- public signup,
- admin dashboards for users,
- magic-link-only auth in MVP.

---

## 9. External integrations

### Market data

Use a narrow provider abstraction.

Minimum conceptual contracts:

```ts
interface MarketDataProvider {
  search(query: string, market?: MarketCode): Promise<InstrumentCandidate[]>;
  getQuotes(instruments: ProviderInstrument[]): Promise<NormalizedQuote[]>;
}
```

Provider-specific symbols must never leak into the domain.

Example:

```text
Internal identity: GPW + PZU
Stooq symbol:      PZU
```

Store provider mappings separately.

All provider responses must:

1. be validated,
2. be normalized,
3. only then enter application/domain code.

Primary providers:

- Stooq EOD for GPW, after coverage verification;
- Massive Basic EOD for USA, after coverage verification.

Manual instrument and manual price fallback must remain possible.

### FX

Use an independent `FxRateProvider`.

Initial implementation:

- official NBP API,
- USD/PLN daily reference rate.

Do not treat NBP fixing as an intraday tradable FX rate.

---

## 10. Data rules

Use:

- PostgreSQL `numeric` for monetary values,
- `timestamptz` in UTC for stored timestamps,
- `Europe/Warsaw` only for presentation and scheduling decisions where required,
- explicit `NULL` for missing data,
- database constraints for hard persistence invariants.

Monitoring history is append-only.

Do not overwrite historical analysis records.

Corrections must create a new revision and point to the previous record where required.

Historical market price used in a monitoring record must never change when the live market quote changes later.

---

## 11. Validation rules

Use Zod for:

- Server Action inputs,
- Route Handler inputs,
- complex browser validation,
- external provider payloads.

Server validation is authoritative.

Database constraints must enforce hard invariants such as:

- uniqueness,
- foreign keys,
- positive monetary values,
- valid score ranges,
- required dictionaries,
- append-only rules where applicable.

Do not rely only on client-side validation.

Do not render provider or user HTML directly.

Sanitize Markdown before rendering.

---

## 12. UI implementation rules

The optional Pencil reference is stored at:

```text
C:\Users\Michał\Documents\ChatGPT\Stock_Monitor\StockMonitor.pen
```

Use it only when the user explicitly asks for Pencil-based implementation, comparison or synchronization.

For ordinary UI work, use explicit user requirements, the current React implementation, shared design tokens and the Visual Architecture where relevant.

The application should feel like a dense professional research terminal, not a generic SaaS dashboard.

Rules:

- desktop-first,
- dark mode first,
- information density over decorative cards,
- no unnecessary gradients,
- subtle separators,
- restrained shadows,
- tabular numeric typography,
- visible currency,
- visible `as of`,
- visible data provider,
- visible freshness state,
- status color must never be the only information carrier,
- WCAG AA minimum,
- keyboard-accessible interactions,
- focus states must remain visible.

Use shadcn/Radix as behavioral/accessibility primitives only.

Do not import a ready-made dashboard theme and force the product into it.

---

## 13. Server Components and Client Components

Default to Server Components.

Use Client Components only when interaction requires them.

Valid reasons include:

- local interactive filtering,
- dialog state,
- complex controlled forms,
- command palette,
- TanStack Table interaction,
- optimistic note/pin interactions where approved.

Avoid adding `"use client"` high in the component tree.

Do not fetch protected server data from the browser when a Server Component can perform the read directly.

---

## 14. State management

For MVP use:

- URL query parameters,
- Server Component data,
- Server Actions,
- React local state,
- React transitions.

Do NOT introduce:

- Redux,
- Zustand,
- TanStack Query,
- global client stores,

unless a later documented requirement proves they are necessary.

---

## 15. Forms

Use native forms + Server Actions for simple operations:

- login,
- archive/restore,
- short notes,
- manual refresh.

Use React Hook Form for complex forms:

- monitoring entry,
- editable statuses,
- multi-row or complex price-level forms.

Do not use React Hook Form mechanically for every form.

---

## 16. Database access conventions

Use:

- `@supabase/supabase-js`,
- generated database types,
- feature-specific data access modules,
- SQL views for read aggregation where they simplify dashboard queries,
- RPC only for operations requiring real transactional atomicity.

Avoid:

- ORM,
- raw SQL scattered across UI components,
- direct complex client-side table mutation,
- N+1 query patterns.

Keep Supabase imports inside infrastructure/server-focused modules whenever practical.

---

## 17. Repository structure

Preferred structure:

```text
stock-monitor/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/
│  │  │  └─ login/
│  │  ├─ (app)/
│  │  │  ├─ dashboard/
│  │  │  ├─ watchlist/
│  │  │  ├─ stocks/
│  │  │  │  └─ [market]/
│  │  │  │     └─ [ticker]/
│  │  │  ├─ monitoring/
│  │  │  └─ settings/
│  │  └─ api/
│  │     ├─ internal/
│  │     │  └─ market-sync/
│  │     └─ v1/
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ layout/
│  │  ├─ dashboard/
│  │  ├─ watchlist/
│  │  ├─ stocks/
│  │  └─ monitoring/
│  ├─ application/
│  │  ├─ stocks/
│  │  ├─ watchlist/
│  │  ├─ monitoring/
│  │  ├─ price-levels/
│  │  ├─ notes/
│  │  ├─ dashboard/
│  │  └─ sync/
│  ├─ domain/
│  │  ├─ stocks/
│  │  ├─ monitoring/
│  │  ├─ price-levels/
│  │  ├─ markets/
│  │  └─ shared/
│  ├─ infrastructure/
│  │  ├─ supabase/
│  │  │  ├─ client/
│  │  │  ├─ server/
│  │  │  ├─ queries/
│  │  │  └─ generated/
│  │  ├─ market-data/
│  │  │  ├─ market-data-provider.ts
│  │  │  ├─ stooq/
│  │  │  ├─ massive/
│  │  │  └─ fixtures/
│  │  ├─ fx/
│  │  │  ├─ fx-rate-provider.ts
│  │  │  └─ nbp/
│  │  └─ logging/
│  ├─ lib/
│  │  ├─ env/
│  │  ├─ validation/
│  │  ├─ dates/
│  │  └─ utils/
│  └─ styles/
├─ supabase/
│  ├─ migrations/
│  ├─ seed.sql
│  └─ tests/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
├─ docs/
│  ├─ PRD-Stock-Monitor-GPW-USA.md
│  ├─ Technology-Stack-Recommendation.md
│  ├─ architecture/
│  └─ runbooks/
├─ scripts/
├─ public/
├─ .env.example
├─ AGENTS.md
├─ README.md
├─ package.json
└─ tsconfig.json
```

The exact folder structure may evolve, but preserve the architecture boundaries.

Do not create empty abstraction folders purely for appearance.

---

## 18. Environment variables

Expected baseline:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_USER_EMAIL=

MASSIVE_API_KEY=
CRON_SECRET=
APP_URL=
```

Rules:

- public variables must be intentionally public,
- server secrets must never use `NEXT_PUBLIC_`,
- `.env.example` contains names only, never real secrets,
- fail fast when required server configuration is missing,
- environment parsing/validation should be centralized.

---

## 19. Testing contract

Use a risk-focused testing strategy.

### Vitest

Test:

- price-distance calculations,
- reached/not-reached logic,
- freshness classification,
- ticker normalization,
- scheduling decisions,
- provider normalization,
- Zod schemas,
- application use cases with meaningful domain rules.

### PostgreSQL / Supabase tests

Test:

- RLS,
- grants,
- constraints,
- unique rules,
- append-only monitoring history,
- atomic monitoring/thesis/status persistence,
- quote conditional-upsert semantics.

### Testing Library

Use only for interactive components with meaningful client behavior.

### Playwright

Maintain one critical MVP journey:

```text
login
-> add stock
-> add price level
-> create monitoring
-> view dashboard
-> archive stock
-> restore stock
```

Also cover:

- unauthorized access,
- provider outage/manual fallback,
- stale-price presentation.

Do not pursue arbitrary code-coverage percentages.

---

## 20. Logging and observability

For MVP use:

- structured application logs,
- Vercel logs,
- Supabase logs,
- persistent `sync_runs`.

Every synchronization attempt should be represented in `sync_runs`.

Never log:

- passwords,
- API tokens,
- service-role keys,
- complete auth tokens,
- sensitive provider payloads.

Do not add Sentry until real diagnostic limitations justify it.

---

## 21. Backup expectations

Before the application becomes the only copy of important investment research:

- maintain SQL migrations and seeds in Git,
- create logical PostgreSQL backups,
- encrypt them,
- store them outside Supabase,
- retain multiple dated generations,
- document restore steps,
- periodically test restoration.

Backup/restore documentation belongs in:

```text
docs/runbooks/
```

---

## 22. MVP scope discipline

Implement ONLY what is required for MVP unless the user explicitly requests otherwise.

Do not pre-build, except for the explicitly approved manual `Monitoruj GPW Okazje` JSON import:

- AI orchestration,
- public API tokens,
- fundamentals,
- charts,
- e-mail alerts,
- portfolio accounting,
- transactions,
- dividends,
- benchmark analytics,
- second data provider,
- Realtime,
- WebSockets,
- offline mode,
- complex saved filters,
- multi-user capabilities.

Design should remain evolvable, but unused future infrastructure must not be built.

---

## 23. Prohibited technologies in MVP

Do NOT introduce without explicit architectural approval:

- Supabase Edge Functions,
- Vercel Cron for frequent sync,
- Vite SPA,
- separate ASP.NET backend,
- separate Node backend,
- microservices,
- Prisma,
- Drizzle,
- any ORM,
- Redis,
- queues,
- message brokers,
- GraphQL,
- WebSockets,
- Supabase Realtime,
- Redux,
- Zustand,
- TanStack Query,
- Kubernetes,
- permanent worker servers,
- external search engine,
- feature flag platforms,
- chart libraries,
- email infrastructure,
- AI SDK orchestration.

---

## 24. Implementation workflow for every task

Before writing code:

1. Read `AGENTS.md`.
2. Read the relevant PRD section.
3. Inspect existing code before changing architecture or implementation patterns.
4. Identify the smallest feature boundary.
5. Inspect Pencil only when the user or task explicitly places it in scope.
6. State any meaningful conflict between PRD, Entity Architecture, technical architecture and explicit task requirements before implementing.
7. Reuse existing code patterns when they remain valid for the requested change.
8. Avoid unrelated refactors.
9. Do not silently expand scope.

During implementation:

1. Keep domain logic independent.
2. Validate input at trusted boundaries.
3. Preserve type safety.
4. Preserve RLS/security boundaries.
5. Handle empty/error/loading states where relevant.
6. Keep provider failures from breaking historical-data reads.
7. Do not expose secrets.
8. For UI work, preserve intentional product geometry, tokens, typography and reusable component patterns rather than substituting generic library defaults.
9. Add tests proportionate to risk.

After implementation:

1. For substantial UI work, render the affected route when tooling permits and verify the requested visual behavior.
2. Compare with Pencil only when Pencil was explicitly included in the task.
3. Run relevant lint/typecheck/tests.
4. Fix regressions caused by the change.
5. Summarize files changed.
6. Explain architecture decisions only if non-obvious.
7. Report remaining limitations and known visual deviations from any explicit reference honestly.
8. Do not claim a visual comparison or test passed unless it was actually performed.

---

## 25. Debugging rule

When asked to fix a bug:

1. inspect the failing code,
2. reproduce or trace the failure where possible,
3. identify the root cause,
4. explain the cause briefly,
5. only then modify code.

Do not perform broad speculative rewrites before diagnosis.

Prefer the smallest correct fix.

Add a regression test when practical.

---

## 26. Dependency rule

Before installing a dependency, ask:

> Does this solve a concrete requirement better than code/platform functionality we already have?

If not, do not install it.

When adding a dependency:

- use a maintained package,
- install only the required package,
- avoid overlapping libraries,
- document why it exists if its purpose is not obvious.

Do not add libraries merely because they are common in starter templates.

---

## 27. Definition of a good implementation

A good change:

- satisfies the requested requirement,
- respects the PRD,
- respects this architecture contract,
- keeps the system understandable for one developer,
- adds the minimum necessary complexity,
- preserves historical integrity,
- preserves authentication and RLS protections,
- remains testable,
- does not create speculative infrastructure,
- preserves the intentional product design and shared tokens,
- uses Pencil only when the task explicitly requests it.

When several approaches are valid, choose the simplest boring solution that fits these rules.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
