import { describe, expect, it } from "vitest";

import { parseStooqCsvQuote } from "@/infrastructure/market-data/stooq/stooq-csv-adapter";
import { parseStooqDailyCsv } from "@/infrastructure/market-data/stooq/stooq-parser";

const csv = `Date,Open,High,Low,Close,Volume
2026-09-09,60.10,61.20,59.80,60.80,1000000
2026-09-10,60.90,62.00,60.50,61.75,1200000`;

const bulkCsv = `<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>
^AEX,D,20260914,000000,1098.38,1101.04,1095.29,1098.35,0,0
PZU,D,20260914,000000,76.44,76.84,75.82,76.32,2207185,0
XTB,D,20260914,000000,73.10,74.20,72.80,73.90,542100,0`;

describe("Stooq CSV adapter", () => {
  it("parses validated daily OHLCV CSV", () => {
    expect(parseStooqDailyCsv(csv)).toEqual([
      {
        Date: "2026-09-09",
        Open: "60.10",
        High: "61.20",
        Low: "59.80",
        Close: "60.80",
        Volume: "1000000",
      },
      expect.objectContaining({ Date: "2026-09-10", Close: "61.75" }),
    ]);
  });

  it.each([
    "",
    "<html>challenge</html>",
    "Date,Close\n2026-09-10,61.75",
    "Date,Open,High,Low,Close,Volume\n2026-09-10,N/D,62,60,61,10",
    "Date,Open,High,Low,Close,Volume\n2026-09-10,61,60,62,61,10",
    "Date,Open,High,Low,Close,Volume\n2026-09-10,61,62,60,61,10,extra",
  ])("rejects empty, non-CSV, or malformed responses", (payload) => {
    expect(() => parseStooqDailyCsv(payload)).toThrow();
  });

  it("normalizes the latest row and derives previous close locally", () => {
    expect(
      parseStooqCsvQuote(
        csv,
        {
          stockId: "pzu",
          provider: "STOOQ",
          providerSymbol: "PZU",
          market: "GPW",
          currency: "PLN",
        },
        new Date("2026-09-11T18:30:00.000Z"),
      ),
    ).toEqual(
      expect.objectContaining({
        stockId: "pzu",
        tradingDate: "2026-09-10",
        open: "60.90",
        high: "62.00",
        low: "60.50",
        price: "61.75",
        previousClose: "60.80",
        volume: "1200000",
        currency: "PLN",
        provider: "Stooq CSV",
        asOf: "2026-09-10T15:00:00.000Z",
      }),
    );
  });

  it("selects the requested ticker from a Stooq bulk daily export", () => {
    expect(
      parseStooqCsvQuote(
        bulkCsv,
        {
          stockId: "pzu",
          provider: "STOOQ",
          providerSymbol: "PZU",
          market: "GPW",
          currency: "PLN",
        },
        new Date("2026-09-14T18:30:00.000Z"),
      ),
    ).toEqual(
      expect.objectContaining({
        stockId: "pzu",
        tradingDate: "2026-09-14",
        open: "76.44",
        high: "76.84",
        low: "75.82",
        price: "76.32",
        previousClose: null,
        volume: "2207185",
        asOf: "2026-09-14T15:00:00.000Z",
      }),
    );
  });

  it("rejects a Stooq bulk export without the requested ticker", () => {
    expect(() => parseStooqDailyCsv(bulkCsv, "PKO")).toThrow(
      "The Stooq CSV contains no daily prices.",
    );
  });

  it("accepts semicolon-delimited Polish headers and ignores extra columns", () => {
    expect(
      parseStooqDailyCsv(
        "Data;Otwarcie;Najwyższy;Najniższy;Zamknięcie;Wolumen;Uwagi\n2026-09-10;60.90;62.00;60.50;61.75;1200000;EOD",
      ),
    ).toEqual([
      {
        Date: "2026-09-10",
        Open: "60.90",
        High: "62.00",
        Low: "60.50",
        Close: "61.75",
        Volume: "1200000",
      },
    ]);
  });
});
