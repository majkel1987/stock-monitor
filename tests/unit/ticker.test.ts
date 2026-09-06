import { describe, expect, it } from "vitest";

import { InvalidTickerError, normalizeTicker } from "@/domain/stocks/ticker";

describe("normalizeTicker", () => {
  it.each(["pzu", "Pzu", " PZU "])("normalizes %s", (ticker) => {
    expect(normalizeTicker(ticker, "GPW")).toBe("PZU");
  });

  it.each(["PZU.WAR", "pzu.wa"])(
    "removes a documented GPW provider suffix from %s",
    (ticker) => {
      expect(normalizeTicker(ticker, "GPW")).toBe("PZU");
    },
  );

  it("rejects a blank ticker", () => {
    expect(() => normalizeTicker("   ", "USA")).toThrow(InvalidTickerError);
  });

  it("preserves a valid US class-share ticker", () => {
    expect(normalizeTicker(" brk.b ", "USA")).toBe("BRK.B");
  });
});
