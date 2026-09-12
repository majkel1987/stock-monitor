import "server-only";

import type {
  NormalizedQuote,
  ProviderInstrument,
} from "@/application/sync/market-data-provider";
import type { StooqCsvParsedData } from "@/application/sync/import-stooq-csv";
import {
  MARKET_SESSIONS,
  zonedSessionTimestamp,
} from "@/domain/markets/market-session";
import { parseStooqDailyCsv } from "./stooq-parser";

export function parseStooqCsvQuote(
  payload: string,
  instrument: ProviderInstrument,
  receivedAt: Date,
): NormalizedQuote {
  const rows = parseStooqDailyCsv(payload).sort((left, right) =>
    left.Date.localeCompare(right.Date),
  );
  const latest = rows.at(-1)!;
  const previousClose = rows.at(-2)?.Close ?? null;
  const session = MARKET_SESSIONS.GPW;
  const asOf = zonedSessionTimestamp(
    latest.Date,
    session.closeMinute,
    session.timeZone,
  );
  if (!asOf) throw new Error("Stooq CSV contains an invalid trading date.");

  return {
    stockId: instrument.stockId,
    tradingDate: latest.Date,
    open: latest.Open,
    high: latest.High,
    low: latest.Low,
    price: latest.Close,
    currency: "PLN",
    previousClose,
    dayChangePct: previousClose
      ? String(
          ((Number(latest.Close) - Number(previousClose)) /
            Number(previousClose)) *
            100,
        )
      : null,
    volume: latest.Volume,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketCap: null,
    asOf: asOf.toISOString(),
    receivedAt: receivedAt.toISOString(),
    provider: "Stooq CSV",
    delayMinutes: null,
  };
}

export function parseStooqCsvImport(
  payload: string,
  instrument: ProviderInstrument,
  receivedAt: Date,
): StooqCsvParsedData {
  const rows = parseStooqDailyCsv(payload).sort((left, right) =>
    left.Date.localeCompare(right.Date),
  );

  return {
    prices: rows.map((row) => ({
      tradingDate: row.Date,
      open: row.Open,
      high: row.High,
      low: row.Low,
      close: row.Close,
      adjustedClose: null,
      volume: row.Volume,
      currency: "PLN",
      provider: "Stooq CSV",
    })),
    latestQuote: parseStooqCsvQuote(payload, instrument, receivedAt),
  };
}
