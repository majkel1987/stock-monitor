import { describe, expect, it, vi } from "vitest";

import { EodhdMarketDataProvider } from "@/infrastructure/market-data/eodhd/eodhd-provider";

describe("EODHD adapter", () => {
  it("normalizes provider search without leaking the suffix into the ticker", async () => {
    const client = {
      search: vi.fn().mockResolvedValue([
        {
          Code: "PZU.WAR",
          Exchange: "WAR",
          Name: "Powszechny Zaklad Ubezpieczen SA",
          Currency: "PLN",
          ISIN: "PLPZU0000011",
        },
      ]),
      quotes: vi.fn(),
    };

    await expect(
      new EodhdMarketDataProvider(client).search("PZU", "GPW"),
    ).resolves.toEqual([
      expect.objectContaining({
        ticker: "PZU",
        providerSymbol: "PZU.WAR",
        market: "GPW",
      }),
    ]);
  });

  it("normalizes a quote and leaves unsupported optional fields null", async () => {
    const client = {
      search: vi.fn(),
      quotes: vi.fn().mockResolvedValue({
        code: "MSFT.US",
        timestamp: 1_788_544_800,
        close: 512.25,
        previousClose: 510,
        change_p: 0.4412,
        volume: 123456,
      }),
    };

    const [quote] = await new EodhdMarketDataProvider(client).getQuotes([
      {
        stockId: "stock-id",
        providerSymbol: "MSFT.US",
        market: "USA",
        currency: "USD",
      },
    ]);

    expect(quote).toMatchObject({
      stockId: "stock-id",
      price: "512.25",
      currency: "USD",
      provider: "EODHD",
      marketCap: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
    });
  });

  it.each([
    { code: "MSFT.US", timestamp: 1_788_544_800, close: 0 },
    { code: "MSFT.US", timestamp: -1, close: 100 },
    { unexpected: true },
  ])("rejects malformed quote payloads", async (payload) => {
    const provider = new EodhdMarketDataProvider({
      search: vi.fn(),
      quotes: vi.fn().mockResolvedValue(payload),
    });

    await expect(
      provider.getQuotes([
        {
          stockId: "stock-id",
          providerSymbol: "MSFT.US",
          market: "USA",
          currency: "USD",
        },
      ]),
    ).rejects.toMatchObject({ code: "provider_invalid_response" });
  });
});
