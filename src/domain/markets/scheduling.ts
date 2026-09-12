import type { MarketCode } from "./market";
import {
  isBusinessWeekday,
  MARKET_SESSIONS,
  zonedDateParts,
} from "./market-session";

const POST_CLOSE_EOD_DELAY_MINUTES = 90;
const NBP_FIRST_ATTEMPT_MINUTE = 13 * 60;

export function shouldSyncMarket(market: MarketCode, now: Date) {
  const session = MARKET_SESSIONS[market];
  const current = zonedDateParts(now, session.timeZone);
  if (!current || !isBusinessWeekday(current.weekday)) return false;

  return (
    current.minuteOfDay >= session.closeMinute + POST_CLOSE_EOD_DELAY_MINUTES
  );
}

export function shouldSyncUsdPln({
  now,
  latestEffectiveDate,
}: {
  now: Date;
  latestEffectiveDate: string | null;
}) {
  const current = zonedDateParts(now, "Europe/Warsaw");
  if (!current || !isBusinessWeekday(current.weekday)) return false;
  if (current.minuteOfDay < NBP_FIRST_ATTEMPT_MINUTE) return false;
  return latestEffectiveDate !== current.date;
}

export function scheduledWorkDue({
  now,
  latestFxEffectiveDate,
}: {
  now: Date;
  latestFxEffectiveDate: string | null;
}) {
  const markets = (["GPW", "USA"] as const).filter((market) =>
    shouldSyncMarket(market, now),
  );

  return {
    markets,
    fx: shouldSyncUsdPln({ now, latestEffectiveDate: latestFxEffectiveDate }),
  };
}
