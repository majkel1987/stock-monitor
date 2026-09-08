import type { MarketCode } from "./market";
import {
  isBusinessWeekday,
  MARKET_SESSIONS,
  zonedDateParts,
} from "./market-session";

export const MARKET_DATA_FRESHNESS = [
  "fresh",
  "delayed",
  "stale",
  "closed",
  "unknown",
] as const;

export type MarketDataFreshness = (typeof MARKET_DATA_FRESHNESS)[number];

function previousWeekday(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  do {
    date.setUTCDate(date.getUTCDate() - 1);
  } while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  return date.toISOString().slice(0, 10);
}

export function classifyMarketDataFreshness({
  market,
  asOf,
  now = new Date(),
  expectedDelayMinutes = 20,
  toleranceMinutes = 45,
}: {
  market: MarketCode;
  asOf: string | Date | null;
  now?: Date;
  expectedDelayMinutes?: number;
  toleranceMinutes?: number;
}): MarketDataFreshness {
  if (!asOf) return "unknown";

  const quoteDate = asOf instanceof Date ? asOf : new Date(asOf);
  const session = MARKET_SESSIONS[market];
  const current = zonedDateParts(now, session.timeZone);
  const quote = zonedDateParts(quoteDate, session.timeZone);
  const ageMinutes = (now.getTime() - quoteDate.getTime()) / 60_000;

  if (!current || !quote || !Number.isFinite(ageMinutes) || ageMinutes < -5) {
    return "unknown";
  }

  const isWeekday = isBusinessWeekday(current.weekday);
  if (!isWeekday) {
    return quote.date >= previousWeekday(current.date) ? "closed" : "stale";
  }

  if (current.minuteOfDay < session.openMinute) {
    return quote.date >= previousWeekday(current.date) ? "closed" : "stale";
  }

  if (current.minuteOfDay >= session.closeMinute) {
    return quote.date === current.date ? "closed" : "stale";
  }

  if (quote.date !== current.date) return "stale";

  return ageMinutes <= expectedDelayMinutes + toleranceMinutes
    ? "fresh"
    : "delayed";
}
