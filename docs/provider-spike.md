# GPW + USA EOD provider spike

## Current status

The reproducible spike was executed on 2026-09-11. Massive and NBP passed; Stooq returned its
browser-verification page instead of CSV from the implementation environment. NBP returned USD/PLN
`3.7267` effective `2026-09-11` (PASS). No price or volume is claimed for the four GPW stocks.

| Ticker | Market | Provider | Provider Symbol | Price   | Currency | As Of      | Volume     | Result       | Notes                         |
| ------ | ------ | -------- | --------------- | ------- | -------- | ---------- | ---------- | ------------ | ----------------------------- |
| PZU    | GPW    | Stooq    | PZU             | —       | PLN      | —          | —          | Not verified | Browser verification returned |
| XTB    | GPW    | Stooq    | XTB             | —       | PLN      | —          | —          | Not verified | Browser verification returned |
| DVL    | GPW    | Stooq    | DVL             | —       | PLN      | —          | —          | Not verified | Browser verification returned |
| ABE    | GPW    | Stooq    | ABE             | —       | PLN      | —          | —          | Not verified | Browser verification returned |
| MSFT   | USA    | Massive  | MSFT            | 492.44  | USD      | 2026-09-10 | 16,038,805 | Pass         | EOD OHLCV available           |
| V      | USA    | Massive  | V               | 367.21  | USD      | 2026-09-10 | 3,801,040  | Pass         | EOD OHLCV available           |
| EME    | USA    | Massive  | EME             | 748.33  | USD      | 2026-09-10 | 231,286    | Pass         | EOD OHLCV available           |
| FIX    | USA    | Massive  | FIX             | 1590.81 | USD      | 2026-09-10 | 213,025    | Pass         | EOD OHLCV available           |

The official Massive Basic plan currently advertises EOD data and five API calls per minute. The
spike and production adapter therefore issue requests sequentially with a 12.1-second spacing. The
Massive endpoint is `GET /v2/aggs/ticker/{ticker}/prev`.

Stooq's public historical endpoint is `GET /q/d/l/` and returns
`Date,Open,High,Low,Close,Volume`; it does not use an API key. Direct automated tests from the
implementation environment returned a JavaScript verification page rather than CSV. The adapter
rejects that response and does not attempt to bypass Stooq's access control.

## Reproduce

Set `MASSIVE_API_KEY` in `.env.local`, then run:

```text
pnpm provider:spike
```

The script never prints either key or a URL containing it. It prints the required table plus the
latest official NBP USD/PLN rate. Copy verified values into this document only after reviewing that
the trading date, currency, and volume are plausible.
