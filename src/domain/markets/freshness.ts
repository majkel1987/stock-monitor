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
}: {
  market: MarketCode;
  asOf: string | Date | null;
  now?: Date;
}): MarketDataFreshness {
  if (!asOf) return "unknown";

  const quoteDate = asOf instanceof Date ? asOf : new Date(asOf);
  const session = MARKET_SESSIONS[market];
  const current = zonedDateParts(now, session.timeZone);
  const quote = zonedDateParts(quoteDate, session.timeZone);
  if (!current || !quote || quoteDate.getTime() > now.getTime() + 5 * 60_000) {
    return "unknown";
  }

  const isWeekday = isBusinessWeekday(current.weekday);
  const expectedSessionDate =
    isWeekday && current.minuteOfDay >= session.closeMinute
      ? current.date
      : previousWeekday(current.date);
  if (quote.date < expectedSessionDate) return "stale";
  if (
    !isWeekday ||
    current.minuteOfDay < session.openMinute ||
    current.minuteOfDay >= session.closeMinute
  ) {
    return "closed";
  }
  return "fresh";
}
