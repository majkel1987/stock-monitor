# ADR-004: Skill JSON import as an application input contract

- Status: Accepted
- Date: 2026-09-16

## Context

The original PRD deferred AI-generated JSON import to V1 and described a small, single-company payload. The finalized `Monitoruj GPW Okazje` methodology now emits one GPW market-screening run containing multiple company analyses under schema version `1.0` and export type `gpw_opportunity_monitoring`.

The application is not responsible for producing fundamental analysis, valuations, scores, scenarios, or decisions. Its responsibility is to validate, preserve, version, present, and monitor the skill output.

## Decision

The canonical JSON Schema in [`docs/schemas/gpw-monitoring-import.schema.json`](../schemas/gpw-monitoring-import.schema.json) is the source of truth for the import boundary.

The import lifecycle is:

```text
raw JSON
→ canonical schema and semantic validation
→ immutable batch plus independently reviewed items
→ selective per-item commit
→ stock/watchlist resolution
→ immutable monitoring and thesis snapshots
```

Frequently queried values are stored in typed columns on `monitoring_results`. The complete company analysis is stored in the bounded `analysis_details` JSONB snapshot. This avoids a large collection of tables whose only purpose would be reconstructing the imported document.

`score.total` is stored as `investment_score`. The legacy optional score columns remain available for manual monitoring but are not populated by this import.

Analytical `decision.action` and configurable watchlist `classification.status` remain separate. Statuses are resolved only by an existing, active `status_definitions.slug`; arbitrary JSON strings never create statuses.

Each company `externalId` becomes the monitoring `source_reference`. A partial unique index makes `json_import` commits idempotent. Import batch `externalId` is independently unique per user.

Each item commit is a PostgreSQL transaction that creates or resolves the stock, restores or creates its watchlist row, creates the immutable monitoring and thesis, optionally applies explicitly reviewed tranche actions, and updates the current status. Failure rolls back the whole item without affecting other items in the batch.

## Consequences

- Manual monitoring remains supported.
- A later import of the same ticker with a new company `externalId` creates another historical monitoring.
- Current quotes never overwrite `marketData.price` and `marketData.asOf` stored on a historical monitoring.
- Rich analysis can evolve only through a new supported schema version and migration strategy.
- This decision brings only manual JSON import into the current scope. It does not authorize AI orchestration, ChatGPT API calls, fundamentals providers, portfolio accounting, alerts, or broker integration.
