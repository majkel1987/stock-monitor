import "server-only";

import type {
  MarketDataProvider,
  NormalizedQuote,
  ProviderInstrument,
} from "@/application/sync/market-data-provider";
import type { MarketCode } from "@/domain/markets/market";
import {
  MARKET_SESSIONS,
  zonedSessionTimestamp,
} from "@/domain/markets/market-session";
import { HttpStooqClient, type StooqClient } from "./stooq-client";
import { parseStooqDailyCsv, type StooqDailyRow } from "./stooq-parser";

const HISTORY_LOOKBACK_DAYS = 14;
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,23}$/;

function compactDate(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function historyWindow(now: Date) {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - HISTORY_LOOKBACK_DAYS);
  return { from: compactDate(from), to: compactDate(now) };
}

function mapQuote(
  rows: StooqDailyRow[],
  instrument: ProviderInstrument,
  receivedAt: Date,
): NormalizedQuote {
  const sorted = [...rows].sort((left, right) =>
    left.Date.localeCompare(right.Date),
  );
  const latest = sorted.at(-1)!;
  const previous = sorted.at(-2);
  const previousClose = previous?.Close ?? null;
  const session = MARKET_SESSIONS.GPW;
  const asOf = zonedSessionTimestamp(
    latest.Date,
    session.closeMinute,
    session.timeZone,
  );
  if (!asOf) throw new Error("Stooq returned an invalid trading date.");
  const dayChangePct = previousClose
    ? String(
        ((Number(latest.Close) - Number(previousClose)) /
          Number(previousClose)) *
          100,
      )
    : null;

  return {
    stockId: instrument.stockId,
    tradingDate: latest.Date,
    open: latest.Open,
    high: latest.High,
    low: latest.Low,
    price: latest.Close,
    currency: "PLN",
    previousClose,
    dayChangePct,
    volume: latest.Volume,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketCap: null,
    asOf: asOf.toISOString(),
    receivedAt: receivedAt.toISOString(),
    provider: "Stooq",
    delayMinutes: null,
  };
}

export class StooqMarketDataProvider implements MarketDataProvider {
  readonly code = "STOOQ";
  readonly displayName = "Stooq";

  constructor(
    private readonly client: StooqClient,
    private readonly now = () => new Date(),
  ) {}

  async search(query: string, market?: MarketCode) {
    if (market && market !== "GPW") return [];
    const ticker = query.trim().toUpperCase();
    if (!SYMBOL_PATTERN.test(ticker)) return [];
    const window = historyWindow(this.now());
    parseStooqDailyCsv(
      await this.client.dailyHistory(ticker, window.from, window.to),
    );
    return [
      {
        provider: this.code,
        providerSymbol: ticker,
        ticker,
        market: "GPW" as const,
        name: ticker,
        exchange: "GPW",
        currency: "PLN" as const,
        isin: null,
      },
    ];
  }

  async getQuotes(instruments: ProviderInstrument[]) {
    const now = this.now();
    const window = historyWindow(now);
    const quotes: NormalizedQuote[] = [];
    let lastError: unknown;
    for (const instrument of instruments) {
      if (
        instrument.market !== "GPW" ||
        instrument.provider.toUpperCase() !== this.code
      )
        continue;
      try {
        const rows = parseStooqDailyCsv(
          await this.client.dailyHistory(
            instrument.providerSymbol,
            window.from,
            window.to,
          ),
        );
        quotes.push(mapQuote(rows, instrument, now));
      } catch (error) {
        lastError = error;
        // Missing and invalid instruments are reported by the synchronization use case.
      }
    }
    if (quotes.length === 0 && lastError) throw lastError;
    return quotes;
  }
}

export function createStooqProvider(options: { deadlineAtMs?: number } = {}) {
  return new StooqMarketDataProvider(
    new HttpStooqClient(
      fetch,
      10_000,
      options.deadlineAtMs ?? Number.POSITIVE_INFINITY,
    ),
  );
}
