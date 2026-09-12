import { describe, expect, it, vi } from "vitest";

import { HttpMassiveClient } from "@/infrastructure/market-data/massive/massive-client";
import { MassiveMarketDataProvider } from "@/infrastructure/market-data/massive/massive-provider";

const bar = {
  status: "OK",
  ticker: "MSFT",
  results: [
    {
      T: "MSFT",
      o: 510.25,
      h: 515.75,
      l: 508.5,
      c: 514.1,
      v: 22_500_000,
      t: Date.parse("2026-09-10T04:00:00.000Z"),
    },
  ],
};

describe("Massive Basic EOD adapter", () => {
  it("normalizes a previous-day aggregate without inventing previous close", async () => {
    const provider = new MassiveMarketDataProvider(
      {
        search: vi.fn(),
        previousDay: vi.fn().mockResolvedValue(bar),
      },
      () => new Date("2026-09-11T00:00:00.000Z"),
    );

    await expect(
      provider.getQuotes([
        {
          stockId: "msft",
          provider: "MASSIVE",
          providerSymbol: "MSFT",
          market: "USA",
          currency: "USD",
        },
      ]),
    ).resolves.toEqual([
      expect.objectContaining({
        stockId: "msft",
        tradingDate: "2026-09-10",
        open: "510.25",
        high: "515.75",
        low: "508.5",
        price: "514.1",
        previousClose: null,
        volume: "22500000",
        currency: "USD",
        provider: "Massive",
      }),
    ]);
  });

  it("keeps a valid ticker when another response is malformed", async () => {
    const provider = new MassiveMarketDataProvider({
      search: vi.fn(),
      previousDay: vi
        .fn()
        .mockResolvedValueOnce(bar)
        .mockResolvedValueOnce({ status: "OK", ticker: "FIX", results: [] }),
    });

    const quotes = await provider.getQuotes([
      {
        stockId: "msft",
        provider: "MASSIVE",
        providerSymbol: "MSFT",
        market: "USA",
        currency: "USD",
      },
      {
        stockId: "fix",
        provider: "MASSIVE",
        providerSymbol: "FIX",
        market: "USA",
        currency: "USD",
      },
    ]);
    expect(quotes.map((quote) => quote.stockId)).toEqual(["msft"]);
  });

  it("rejects an impossible EOD range", async () => {
    const provider = new MassiveMarketDataProvider({
      search: vi.fn(),
      previousDay: vi.fn().mockResolvedValue({
        ...bar,
        results: [{ ...bar.results[0], h: 500, l: 510 }],
      }),
    });

    await expect(
      provider.getQuotes([
        {
          stockId: "msft",
          provider: "MASSIVE",
          providerSymbol: "MSFT",
          market: "USA",
          currency: "USD",
        },
      ]),
    ).resolves.toEqual([]);
  });

  it("spaces Basic-plan calls and does not retry HTTP 429", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "OK", results: [] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 429 }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = new HttpMassiveClient("secret", fetcher, 1000, Infinity, {
      sleep,
      now: () => 0,
    });

    await client.search("MSFT");
    await expect(client.previousDay("MSFT")).rejects.toMatchObject({
      code: "provider_rate_limited",
    });
    expect(sleep).toHaveBeenCalledWith(12_100);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
