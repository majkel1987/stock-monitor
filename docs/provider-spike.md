# EODHD provider coverage spike

## Current status

Provider spike: **NOT RUN**

Reason: `EODHD_API_TOKEN` was unavailable in the implementation environment on
2026-09-07.

No coverage result is claimed for PZU, XTB, DVL, ABE, MSFT, V, EME or FIX.

## Reproducible verification

Run from the repository root with a server-only token in the process
environment:

```text
pnpm provider:spike
```

The script checks each required ticker through EODHD search, selects only the
exact `.WAR` or `.US` listing returned by the provider, then requests its
real-time/delayed quote. It reports:

- search and provider symbol,
- price and timestamp,
- currency from the verified search candidate,
- previous close, daily change and volume,
- 52-week high, 52-week low and market cap as unavailable from the selected
  real-time endpoint.

The script never prints the token or a URL containing it. HTTP requests use an
8-second timeout and are sequential to avoid burst traffic.

## Endpoint contract used by M6

- Search: `GET /api/search/{query}`
- Delayed/current quote: `GET /api/real-time/{providerSymbol}`

EODHD documents the live endpoint as delayed for general exchange coverage.
The M6 adapter uses a 20-minute expected delay and persists unavailable optional
fundamental/range fields as `NULL`, never as zero.
