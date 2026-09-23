import {
  calculatePortfolioSummary,
  calculatePosition,
} from "@/domain/portfolio/calculations";
import type {
  PortfolioData,
  PortfolioPosition,
  PortfolioReader,
} from "./types";

export async function getPortfolio(
  reader: PortfolioReader,
  userId: string,
): Promise<PortfolioData> {
  const source = await reader.read(userId);
  const quoteByStock = new Map(
    source.quotes.map((quote) => [quote.stockId, quote]),
  );
  const transactionsByStock = new Map<string, typeof source.transactions>();

  for (const transaction of source.transactions) {
    const current = transactionsByStock.get(transaction.stockId) ?? [];
    current.push(transaction);
    transactionsByStock.set(transaction.stockId, current);
  }

  const positions: PortfolioPosition[] = [];
  for (const stock of source.stocks) {
    const transactions = transactionsByStock.get(stock.id);
    if (!transactions?.length) continue;
    const storedQuote = quoteByStock.get(stock.id) ?? null;
    const quote = storedQuote?.currency === stock.currency ? storedQuote : null;
    const metrics = calculatePosition(
      transactions.map((transaction) => ({
        quantity: transaction.quantity,
        pricePerShare: transaction.pricePerShare,
      })),
      quote?.price ?? null,
    );
    positions.push({
      ...stock,
      transactions,
      ...metrics,
      currentPrice: quote?.price ?? null,
      quote,
    });
  }

  positions.sort((left, right) => left.ticker.localeCompare(right.ticker));
  const summary = calculatePortfolioSummary(
    positions.map((position) => ({
      currency: position.currency,
      totalCostBasis: position.totalCostBasis,
      currentValue: position.currentValue,
    })),
    source.usdPlnRate?.rate ?? null,
  );

  return {
    stocks: source.stocks,
    positions,
    summary: {
      ...summary,
      unavailablePriceCount: positions.filter(
        (position) => position.currentValue === null,
      ).length,
    },
    usdPlnRate: source.usdPlnRate,
  };
}
