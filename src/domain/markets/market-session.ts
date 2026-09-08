import type { MarketCode } from "./market";

export type MarketSessionDefinition = {
  timeZone: string;
  openMinute: number;
  closeMinute: number;
};

export const MARKET_SESSIONS: Record<MarketCode, MarketSessionDefinition> = {
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

export type ZonedDateParts = {
  date: string;
  weekday: string;
  minuteOfDay: number;
};

const weekdays = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export function isBusinessWeekday(weekday: string) {
  return weekdays.has(weekday);
}

export function zonedDateParts(
  date: Date,
  timeZone: string,
): ZonedDateParts | null {
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
