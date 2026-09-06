import type {
  WatchlistData,
  WatchlistQuery,
  WatchlistReader,
  WatchlistRow,
} from "./types";
import { parseWatchlistQuery, type RawWatchlistQuery } from "./schemas";

function nullableCompare<T>(
  left: T | null,
  right: T | null,
  compare: (a: T, b: T) => number,
  direction: WatchlistQuery["direction"],
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const result = compare(left, right);
  return direction === "desc" ? -result : result;
}

function compareRows(
  left: WatchlistRow,
  right: WatchlistRow,
  query: WatchlistQuery,
) {
  const text = (a: string, b: string) => a.localeCompare(b, "en");
  const number = (a: number, b: number) => a - b;
  let result = 0;

  switch (query.sort) {
    case "ticker":
      result = text(left.ticker, right.ticker);
      break;
    case "name":
      result = text(left.name, right.name);
      break;
    case "price":
      return (
        nullableCompare(
          left.price ? Number(left.price.value) : null,
          right.price ? Number(right.price.value) : null,
          number,
          query.direction,
        ) || text(left.ticker, right.ticker)
      );
    case "daily_change":
      return (
        nullableCompare(
          left.price?.dayChangePct ? Number(left.price.dayChangePct) : null,
          right.price?.dayChangePct ? Number(right.price.dayChangePct) : null,
          number,
          query.direction,
        ) || text(left.ticker, right.ticker)
      );
    case "status":
      result =
        number(left.status.sortOrder, right.status.sortOrder) ||
        text(left.status.label, right.status.label);
      break;
    case "investment_score":
      return (
        nullableCompare(
          left.lastMonitoring?.investmentScore ?? null,
          right.lastMonitoring?.investmentScore ?? null,
          number,
          query.direction,
        ) || text(left.ticker, right.ticker)
      );
    case "last_monitored":
      return (
        nullableCompare(
          left.lastMonitoring?.analyzedAt ?? null,
          right.lastMonitoring?.analyzedAt ?? null,
          text,
          query.direction,
        ) || text(left.ticker, right.ticker)
      );
    case "priority":
      return (
        nullableCompare(
          left.displayOrder,
          right.displayOrder,
          number,
          query.direction,
        ) || text(left.ticker, right.ticker)
      );
  }

  const directed = query.direction === "desc" ? -result : result;
  return directed || text(left.ticker, right.ticker);
}

export async function getWatchlist(
  reader: WatchlistReader,
  userId: string,
  rawQuery: RawWatchlistQuery,
): Promise<WatchlistData & { query: WatchlistQuery }> {
  const query = parseWatchlistQuery(rawQuery);
  const data = await reader.read(userId, query);

  return {
    ...data,
    rows: [...data.rows].sort((left, right) => compareRows(left, right, query)),
    query,
  };
}
