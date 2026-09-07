import type { MarketCode } from "./market";

export const MARKET_DATA_FRESHNESS = [
  "fresh",
  "delayed",
  "stale",
  "closed",
  "unknown",
] as const;

export type MarketDataFreshness = (typeof MARKET_DATA_FRESHNESS)[number];

type SessionDefinition = {
  timeZone: string;
  openMinute: number;
  closeMinute: number;
};

const sessions: Record<MarketCode, SessionDefinition> = {
  GPW: {
    timeZone: "Europe/Warsaw",
    openMinute: 9 * 60,
    closeMinute: 17 * 60,
  },
  USA: {
    timeZone: "America/New_York",
    openMinute: 9 * 60 + 30,
    closeMinute: 16 * 60,
  },
};

const weekdays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

type ZonedParts = {
  date: string;
  weekday: string;
  minuteOfDay: number;
};

function zonedParts(date: Date, timeZone: string): ZonedParts | null {
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const weekday = value("weekday");
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));

  if (
    !year ||
    !month ||
    !day ||
    !weekday ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  return {
    date: `${year}-${month}-${day}`,
    weekday,
    minuteOfDay: hour * 60 + minute,
  };
}

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
  const session = sessions[market];
  const current = zonedParts(now, session.timeZone);
  const quote = zonedParts(quoteDate, session.timeZone);
  const ageMinutes = (now.getTime() - quoteDate.getTime()) / 60_000;

  if (!current || !quote || !Number.isFinite(ageMinutes) || ageMinutes < -5) {
    return "unknown";
  }

  const isWeekday = weekdays.has(current.weekday);
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
