import { describe, expect, it } from "vitest";

import { classifyMarketDataConfiguration } from "@/application/sync/market-data-configuration";

describe("market-data configuration status", () => {
  it.each([
    [false, true, "incomplete"],
    [false, false, "incomplete"],
    [true, false, "manual"],
    [true, true, "ready"],
  ] as const)(
    "classifies writes=%s and USA provider=%s as %s",
    (writesConfigured, usaProviderConfigured, expected) => {
      expect(
        classifyMarketDataConfiguration({
          writesConfigured,
          usaProviderConfigured,
        }),
      ).toBe(expected);
    },
  );
});
