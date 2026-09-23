import type { CurrencyCode, MarketCode } from "@/domain/markets/market";

export type PortfolioStock = {
  id: string;
  ticker: string;
  name: string;
  marketCode: MarketCode;
  currency: CurrencyCode;
};

export type PortfolioTransaction = {
  id: string;
  stockId: string;
  transactionDate: string;
  quantity: string;
  pricePerShare: string;
  currency: CurrencyCode;
  createdAt: string;
  updatedAt: string;
};

export type PortfolioQuote = {
  stockId: string;
  price: string;
  currency: CurrencyCode;
  asOf: string;
  provider: string;
  qualityStatus: string;
};

export type PortfolioSourceData = {
  stocks: PortfolioStock[];
  transactions: PortfolioTransaction[];
  quotes: PortfolioQuote[];
  usdPlnRate: {
    rate: string;
    effectiveDate: string;
    asOf: string;
    provider: "NBP";
  } | null;
};

export interface PortfolioReader {
  read(userId: string): Promise<PortfolioSourceData>;
}

export type PortfolioPosition = PortfolioStock & {
  transactions: PortfolioTransaction[];
  totalQuantity: string;
  totalCostBasis: string;
  averagePurchasePrice: string;
  currentPrice: string | null;
  currentValue: string | null;
  profitLoss: string | null;
  profitLossPercent: string | null;
  quote: PortfolioQuote | null;
};

export type PortfolioData = {
  stocks: PortfolioStock[];
  positions: PortfolioPosition[];
  summary: {
    totalCostBasisPln: string | null;
    currentValuePln: string | null;
    profitLossPln: string | null;
    returnPercent: string | null;
    unavailablePriceCount: number;
  };
  usdPlnRate: PortfolioSourceData["usdPlnRate"];
};

export type SavePortfolioTransactionInput = {
  stockId: string;
  transactionDate: string;
  quantity: string;
  pricePerShare: string;
};

export interface PortfolioWriter {
  create(
    userId: string,
    input: SavePortfolioTransactionInput,
  ): Promise<"created" | "invalid_stock">;
  update(
    userId: string,
    transactionId: string,
    input: Omit<SavePortfolioTransactionInput, "stockId">,
  ): Promise<boolean>;
  delete(userId: string, transactionId: string): Promise<boolean>;
}
