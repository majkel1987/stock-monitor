# ADR-005: Portfolio as BUY lots over canonical stocks

**Status:** Accepted  
**Date:** 2026-09-19

## Context

Portfolio was originally listed as V2 scope. The product owner explicitly requested its implementation while keeping the existing watchlist, monitoring, market-data and FX architecture unchanged.

One company may be purchased repeatedly at different dates and prices. Portfolio ownership must remain independent from the editable research status assigned to a watchlist item.

## Decision

- `portfolio_transactions` stores source BUY lots linked to the canonical `stocks` row and authenticated owner.
- The single-user product does not need a separate `portfolios` table yet.
- Quantity and price use PostgreSQL `numeric`; currency is stored on every transaction and must match the stock currency.
- Average purchase price, cost basis, market value and profit/loss are derived at read time. They are not persisted.
- Current valuations reuse `market_quotes`. Portfolio does not call market-data providers directly.
- Combined totals are presented in PLN. Until historical purchase-date FX is introduced, the latest stored NBP USD/PLN rate converts both USD cost basis and current value. The UI labels this assumption.
- A missing quote or required FX rate produces an unavailable aggregate instead of a partial or zero valuation.
- Editing and deleting BUY lots are supported. SELL, realized profit/loss, dividends, fees, splits, transfers and multiple accounts remain outside this decision.

## Consequences

- Adding another BUY lot automatically updates the single aggregated company position.
- Refreshing an existing quote automatically updates portfolio valuation without rewriting transactions.
- Future transaction types can extend the source model, but their accounting rules require a separate decision and migration.
- Historical PLN cost basis will require a dedicated purchase-date FX policy; current-rate conversion is intentionally not presented as historical performance attribution.
