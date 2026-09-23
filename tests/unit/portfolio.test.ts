import { describe, expect, it, vi } from "vitest";

import { getPortfolio } from "@/application/portfolio/get-portfolio";
import {
  deletePortfolioTransaction,
  updatePortfolioTransaction,
} from "@/application/portfolio/manage-transactions";
import {
  createPortfolioTransactionSchema,
  updatePortfolioTransactionSchema,
} from "@/application/portfolio/schemas";
import type {
  PortfolioReader,
  PortfolioWriter,
} from "@/application/portfolio/types";
import {
  calculatePortfolioSummary,
  calculatePosition,
} from "@/domain/portfolio/calculations";

describe("portfolio calculations", () => {
  it("returns a stable zero summary for an empty portfolio", () => {
    expect(calculatePortfolioSummary([], null)).toEqual({
      totalCostBasisPln: "0",
      currentValuePln: "0",
      profitLossPln: "0",
      returnPercent: "0",
    });
  });

  it("calculates one BUY lot", () => {
    expect(
      calculatePosition([{ quantity: "10", pricePerShare: "100" }], "115"),
    ).toEqual({
      totalQuantity: "10",
      totalCostBasis: "1000",
      averagePurchasePrice: "100",
      currentValue: "1150",
      profitLoss: "150",
      profitLossPercent: "15",
    });
  });

  it("aggregates several BUY lots using a quantity-weighted average", () => {
    const position = calculatePosition(
      [
        { quantity: "10", pricePerShare: "20" },
        { quantity: "5", pricePerShare: "25" },
      ],
      "24",
    );

    expect(position.totalQuantity).toBe("15");
    expect(position.totalCostBasis).toBe("325");
    expect(position.averagePurchasePrice).toBe("21.666667");
  });

  it("calculates a negative result", () => {
    const position = calculatePosition(
      [{ quantity: "10", pricePerShare: "100" }],
      "85",
    );
    expect(position.profitLoss).toBe("-150");
    expect(position.profitLossPercent).toBe("-15");
  });

  it("supports fractional shares without floating-point aggregation", () => {
    const position = calculatePosition(
      [
        { quantity: "0.1", pricePerShare: "10.01" },
        { quantity: "0.2", pricePerShare: "10.01" },
      ],
      "10.02",
    );
    expect(position.totalQuantity).toBe("0.3");
    expect(position.totalCostBasis).toBe("3.003");
    expect(position.currentValue).toBe("3.006");
    expect(position.profitLoss).toBe("0.003");
  });

  it("keeps valuation fields unavailable when the quote is missing", () => {
    const position = calculatePosition(
      [{ quantity: "2", pricePerShare: "50" }],
      null,
    );
    expect(position.totalCostBasis).toBe("100");
    expect(position.currentValue).toBeNull();
    expect(position.profitLoss).toBeNull();
    expect(position.profitLossPercent).toBeNull();
  });

  it("weights the total portfolio return by cost basis", () => {
    const summary = calculatePortfolioSummary(
      [
        { currency: "PLN", totalCostBasis: "1000", currentValue: "1100" },
        { currency: "PLN", totalCostBasis: "100", currentValue: "80" },
      ],
      null,
    );
    expect(summary.totalCostBasisPln).toBe("1100");
    expect(summary.currentValuePln).toBe("1180");
    expect(summary.profitLossPln).toBe("80");
    expect(summary.returnPercent).toBe("7.2727");
  });

  it("converts USA positions with the supplied USD/PLN rate", () => {
    const summary = calculatePortfolioSummary(
      [
        { currency: "PLN", totalCostBasis: "100", currentValue: "110" },
        { currency: "USD", totalCostBasis: "20", currentValue: "25" },
      ],
      "4",
    );
    expect(summary.totalCostBasisPln).toBe("180");
    expect(summary.currentValuePln).toBe("210");
    expect(summary.returnPercent).toBe("16.6667");
  });

  it("does not publish misleading combined totals without required FX", () => {
    const summary = calculatePortfolioSummary(
      [{ currency: "USD", totalCostBasis: "20", currentValue: "25" }],
      null,
    );
    expect(summary.totalCostBasisPln).toBeNull();
    expect(summary.currentValuePln).toBeNull();
    expect(summary.returnPercent).toBeNull();
  });
});

describe("portfolio application flow", () => {
  it("groups multiple transactions into one company position", async () => {
    const reader: PortfolioReader = {
      read: vi.fn().mockResolvedValue({
        stocks: [
          {
            id: "stock-1",
            ticker: "APT",
            name: "Apator",
            marketCode: "GPW",
            currency: "PLN",
          },
        ],
        transactions: [
          {
            id: "tx-1",
            stockId: "stock-1",
            transactionDate: "2026-05-12",
            quantity: "10",
            pricePerShare: "21.5",
            currency: "PLN",
            createdAt: "2026-05-12T00:00:00Z",
            updatedAt: "2026-05-12T00:00:00Z",
          },
          {
            id: "tx-2",
            stockId: "stock-1",
            transactionDate: "2026-06-24",
            quantity: "5",
            pricePerShare: "24",
            currency: "PLN",
            createdAt: "2026-06-24T00:00:00Z",
            updatedAt: "2026-06-24T00:00:00Z",
          },
        ],
        quotes: [
          {
            stockId: "stock-1",
            price: "25",
            currency: "PLN",
            asOf: "2026-09-18T16:00:00Z",
            provider: "Stooq",
            qualityStatus: "closed",
          },
        ],
        usdPlnRate: null,
      }),
    };

    const portfolio = await getPortfolio(reader, "user-1");
    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0]?.totalQuantity).toBe("15");
    expect(portfolio.positions[0]?.totalCostBasis).toBe("335");
  });

  it("delegates transaction editing and deletion through the application port", async () => {
    const writer: PortfolioWriter = {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(true),
      delete: vi.fn().mockResolvedValue(true),
    };
    const edit = {
      transactionDate: "2026-09-19",
      quantity: "2.5",
      pricePerShare: "10.25",
    };

    await expect(
      updatePortfolioTransaction(writer, "user-1", "tx-1", edit),
    ).resolves.toBe(true);
    await expect(
      deletePortfolioTransaction(writer, "user-1", "tx-1"),
    ).resolves.toBe(true);
    expect(writer.update).toHaveBeenCalledWith("user-1", "tx-1", edit);
    expect(writer.delete).toHaveBeenCalledWith("user-1", "tx-1");
  });
});

describe("portfolio transaction validation", () => {
  it("accepts comma decimal separators and normalizes them", () => {
    const result = createPortfolioTransactionSchema.parse({
      stockId: "10000000-0000-4000-8000-000000000001",
      transactionDate: "2026-09-19",
      quantity: "1,5",
      pricePerShare: "24,50",
    });
    expect(result.quantity).toBe("1.5");
    expect(result.pricePerShare).toBe("24.50");
  });

  it("rejects invalid dates and non-positive amounts", () => {
    const result = updatePortfolioTransactionSchema.safeParse({
      transactionId: "10000000-0000-4000-8000-000000000002",
      transactionDate: "2026-02-30",
      quantity: "0",
      pricePerShare: "-1",
    });
    expect(result.success).toBe(false);
  });
});
