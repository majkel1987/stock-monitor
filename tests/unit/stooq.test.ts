import { describe, expect, it, vi } from "vitest";

import { HttpStooqClient } from "@/infrastructure/market-data/stooq/stooq-client";
import { StooqMarketDataProvider } from "@/infrastructure/market-data/stooq/stooq-provider";
import { parseStooqDailyCsv } from "@/infrastructure/market-data/stooq/stooq-parser";

const csv = `Date,Open,High,Low,Close,Volume
2026-09-09,60.10,61.20,59.80,60.80,1000000
2026-09-10,60.90,62.00,60.50,61.75,1200000`;

describe("Stooq EOD adapter", () => {
  it("requests the public CSV export without credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(csv));
    const client = new HttpStooqClient(fetcher, 1_000);

    await client.dailyHistory("PZU", "20260901", "20260911");

    const url = fetcher.mock.calls[0]?.[0] as URL;
    expect(url.origin + url.pathname).toBe("https://stooq.com/q/d/l/");
    expect(url.searchParams.get("s")).toBe("pzu");
    expect(url.searchParams.get("apikey")).toBeNull();
  });

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

  it("normalizes the latest row and derives previous close locally", async () => {
    const provider = new StooqMarketDataProvider(
      { dailyHistory: vi.fn().mockResolvedValue(csv) },
      () => new Date("2026-09-11T18:30:00.000Z"),
    );

    await expect(
      provider.getQuotes([
        {
          stockId: "pzu",
          provider: "STOOQ",
          providerSymbol: "PZU",
          market: "GPW",
          currency: "PLN",
        },
      ]),
    ).resolves.toEqual([
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
        provider: "Stooq",
        asOf: "2026-09-10T15:00:00.000Z",
      }),
    ]);
  });

  it("returns successful symbols when another Stooq symbol fails", async () => {
    const provider = new StooqMarketDataProvider({
      dailyHistory: vi
        .fn()
        .mockResolvedValueOnce(csv)
        .mockRejectedValueOnce(new Error("missing")),
    });
    const quotes = await provider.getQuotes([
      {
        stockId: "pzu",
        provider: "STOOQ",
        providerSymbol: "PZU",
        market: "GPW",
        currency: "PLN",
      },
      {
        stockId: "bad",
        provider: "STOOQ",
        providerSymbol: "BAD",
        market: "GPW",
        currency: "PLN",
      },
    ]);

    expect(quotes.map((quote) => quote.stockId)).toEqual(["pzu"]);
  });
});
