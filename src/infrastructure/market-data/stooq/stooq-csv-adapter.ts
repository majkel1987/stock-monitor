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
import {
  parseStooqBulkCsv,
  parseStooqDailyCsv,
  type StooqDailyRow,
} from "./stooq-parser";

export function parseStooqCsvQuote(
  payload: string,
  instrument: ProviderInstrument,
  receivedAt: Date,
): NormalizedQuote {
  return quoteFromRows(
    parseStooqDailyCsv(payload, instrument.providerSymbol),
    instrument,
    receivedAt,
  );
}

function quoteFromRows(
  rows: StooqDailyRow[],
  instrument: ProviderInstrument,
  receivedAt: Date,
): NormalizedQuote {
  rows = [...rows].sort((left, right) => left.Date.localeCompare(right.Date));
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
  return importFromRows(
    parseStooqDailyCsv(payload, instrument.providerSymbol),
    instrument,
    receivedAt,
  );
}

export function parseStooqBulkImport(
  payload: string,
  instruments: ProviderInstrument[],
  receivedAt: Date,
): StooqCsvParsedData[] {
  const grouped = parseStooqBulkCsv(
    payload,
    instruments.map((instrument) => instrument.providerSymbol),
  );
  return instruments.flatMap((instrument) => {
    const rows = grouped.get(instrument.providerSymbol.trim().toUpperCase());
    return rows ? [importFromRows(rows, instrument, receivedAt)] : [];
  });
}

function importFromRows(
  rows: StooqDailyRow[],
  instrument: ProviderInstrument,
  receivedAt: Date,
): StooqCsvParsedData {
  rows = [...rows].sort((left, right) => left.Date.localeCompare(right.Date));

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
    latestQuote: quoteFromRows(rows, instrument, receivedAt),
  };
}
