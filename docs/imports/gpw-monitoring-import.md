# GPW opportunity monitoring import

## Contract

- Schema version: `1.0`
- Export type: `gpw_opportunity_monitoring`
- Canonical schema: [`../schemas/gpw-monitoring-import.schema.json`](../schemas/gpw-monitoring-import.schema.json)
- Maximum upload: 1,000,000 UTF-8 bytes
- Maximum companies per batch: 50
- Maximum array length enforced by the application: 100
- Maximum individual text length enforced by the application: 20,000 characters

Application safety limits supplement the canonical contract. They do not reinterpret fields or convert missing numeric values to zero.

## Lifecycle

```text
Select JSON file
→ parse syntax
→ validate batch envelope
→ validate each company independently
→ resolve status, stock, archive state, current price and idempotency
→ persist immutable batch and item drafts
→ review READY / WARNING / ERROR / ALREADY_IMPORTED items
→ selectively commit READY items and accepted WARNING items
```

An invalid company remains visible as an `ERROR` item when the batch envelope is valid. Other items can still be committed. A malformed envelope, unsupported version, wrong export type, invalid JSON, or excessive payload size rejects the file before draft creation.

## JSON to database mapping

| JSON                                                           | Persistence                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| batch metadata and complete raw document                       | `monitoring_import_batches`                                   |
| company raw/normalized draft, validation and review state      | `monitoring_import_items`                                     |
| `identity.market + identity.ticker`                            | existing or new `stocks` row                                  |
| `classification.status`                                        | active `status_definitions.slug` and current watchlist status |
| `score.total`                                                  | `monitoring_results.investment_score`                         |
| `decision.*`                                                   | decision columns plus complete snapshot                       |
| `marketData.price/asOf`                                        | immutable historical monitoring price snapshot                |
| valuation/return values used for list sorting                  | typed `monitoring_results` columns                            |
| complete company object                                        | bounded `monitoring_results.analysis_details`                 |
| thesis summary, drivers, catalysts, pros, risks, kill criteria | immutable `investment_theses` revision                        |
| priced tranches explicitly marked ADD/SUPERSEDE                | `price_levels`                                                |
| event-only tranches                                            | `analysis_details.positionPlan` only                          |

## Idempotency

The same batch `externalId` returns the existing draft. A company `externalId` already committed as `source_type = json_import` is reported as `ALREADY_IMPORTED`. Database uniqueness is the final protection against duplicate monitoring records.

## Security

AI-generated content is untrusted. Validation is server-side, unknown schema properties are rejected, limits are enforced before persistence, raw JSON is never rendered as HTML, and all batch/item rows are owner-scoped through RLS. Source links must be rendered only as safe HTTP(S) links.
