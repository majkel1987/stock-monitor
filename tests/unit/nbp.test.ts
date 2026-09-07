import { describe, expect, it, vi } from "vitest";

import { NbpFxRateProvider } from "@/infrastructure/fx/nbp/nbp-provider";

describe("NBP adapter", () => {
  it("normalizes the latest official table A USD/PLN reference rate", async () => {
    const provider = new NbpFxRateProvider({
      getUsdRate: vi.fn().mockResolvedValue({
        table: "A",
        currency: "dolar amerykański",
        code: "USD",
        rates: [
          { no: "167/A/NBP/2026", effectiveDate: "2026-09-04", mid: 3.6512 },
        ],
      }),
    });

    await expect(provider.getUsdPln()).resolves.toEqual({
      baseCurrency: "USD",
      quoteCurrency: "PLN",
      rate: "3.6512",
      effectiveDate: "2026-09-04",
      asOf: "2026-09-04T00:00:00.000Z",
      provider: "NBP",
    });
  });

  it.each([
    {},
    { table: "A", currency: "USD", code: "USD", rates: [] },
    {
      table: "A",
      currency: "USD",
      code: "USD",
      rates: [{ no: "x", effectiveDate: "bad", mid: 3.6 }],
    },
  ])("rejects malformed payloads", async (payload) => {
    const provider = new NbpFxRateProvider({
      getUsdRate: vi.fn().mockResolvedValue(payload),
    });
    await expect(provider.getUsdPln()).rejects.toMatchObject({
      code: "provider_invalid_response",
    });
  });
});
