# StockMonitor Design System — “Ledger”

Synthesized from Inspo MCP research (2026-09). Adapt patterns; do not copy sites wholesale.

## Selected references

| Reference | What we took |
|-----------|--------------|
| **Blockstream** | Near-black charcoal surfaces, single cool teal accent, large balance numerals, technical mono metadata |
| **N26** | Calm cool teal hierarchy, clear primary metric → secondary labels, soft but restrained radius |
| **Step** | Asymmetric split for sign-in only. No slogan, no second accent |
| **Puzzle** | Large KPI numerals with thin separators, Swiss/minimal data presentation |
| **Algolia** | Cool product chrome, restrained accent, high-contrast type hierarchy |

## 2026-09-22 Inspo pass

`recommend` for a private GPW + USA research terminal returned marketing **Feature Stack** landings (Notion, Step, Qdrant, Algolia, CircleCI). Narrower searches for dark fintech auth and index-first product screens returned nothing. The archive is mostly marketing sites.

Rejected, because they conflict with the research-terminal contract:

- Feature-stack heroes, orbiting icons, photographic slogans
- Navy `#040c3c`, Notion blue `#348ce1`, hot pink CTAs
- Landing-page section rhythm (80–160px)
- Glass, decorative gradients, zebra tables

Kept from the measured genre, where it fits an application:

- Grotesk UI type (Geist Sans) and mono metadata (Geist Mono)
- One cool accent (existing teal)
- Dark canvas, panel, and row — thin rules, no zebra, row hover only to track columns
- Sign-in as a full-viewport split: image one side, form the other
- Dashboard leads with one ruled KPI strip, then an index table

## Direction

**Modern · premium · minimal · data-focused** financial research terminal.

- Dark-first charcoal (not purple-tinted SaaS indigo)
- Cool **teal** primary, used for the primary action and the active state
- Geist Sans + Geist Mono, tabular numerals for money
- Three surfaces: canvas (`--background`), panel (`--card`), row (`--surface-row`)
- Thin borders, subtle shadows, dense-but-breathable layout
- No glassmorphism, decorative gradients in-app, or zebra tables
- Status is never color alone

## Tokens

Source of truth: `src/styles/globals.css`

- Semantic: `--background`, `--card`, `--surface-row`, `--primary`, `--muted`, `--border`, …
- Finance: `--positive`, `--negative`, `--warning`, `--info` (+ subtle fills)
- Layout: `--nav-width: 240px`, `--page-padding`, `--content-max: 90rem`
- Helpers: `.page-frame`, `.data-table`, `.metric-strip`, `.ui-kpi`, `.ui-eyebrow`, `.ui-button-*`

## Primitives

`src/components/ui/terminal.tsx`

- `PageHeader` (`index` for one-line index pages), `ActionButton`, `Surface`, `SectionHeader`
- `StatusBadge`, `MetricStrip`, `MetricCard`, `EmptyState`, `Field`

`src/components/auth/auth-split.tsx`

- Full-viewport sign-in, recovery, and password update

## Accessibility

- WCAG AA contrast targets on text/surfaces
- Status never color-only (badge text + marker bar)
- Visible `:focus-visible` ring using `--ring`
- Active navigation uses a bar as well as color
