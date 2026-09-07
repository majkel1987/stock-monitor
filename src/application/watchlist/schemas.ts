import { z } from "zod";

import { MARKET_CODES } from "@/domain/markets/market";
import { WATCHLIST_SORT_KEYS } from "./types";

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const addStockSchema = z.object({
  marketCode: z.enum(MARKET_CODES),
  ticker: z.string().trim().min(1, "Ticker is required.").max(24),
  name: z.string().trim().min(1, "Company name is required.").max(160),
  initialStatusId: z.uuid("Choose a valid status."),
});

export const providerSearchSchema = z.object({
  marketCode: z.enum(MARKET_CODES),
  query: z.string().trim().min(1, "Enter a ticker or company.").max(80),
});

export const addProviderStockSchema = z.object({
  marketCode: z.enum(MARKET_CODES),
  providerSymbol: z.string().trim().min(1).max(80),
  initialStatusId: z.uuid("Choose a valid status."),
});

export const watchlistItemIdSchema = z.uuid();

export const watchlistQuerySchema = z.object({
  q: z.preprocess(
    firstValue,
    z.string().trim().max(80).optional().catch(undefined),
  ),
  market: z.preprocess(
    firstValue,
    z.enum(MARKET_CODES).optional().catch(undefined),
  ),
  status: z.preprocess(
    firstValue,
    z.string().trim().min(1).max(80).optional().catch(undefined),
  ),
  view: z.preprocess(
    firstValue,
    z.enum(["active", "archived", "all"]).catch("active"),
  ),
  stale: z.preprocess(firstValue, z.literal("1").optional().catch(undefined)),
  unmonitored: z.preprocess(
    firstValue,
    z.literal("1").optional().catch(undefined),
  ),
  sort: z.preprocess(firstValue, z.enum(WATCHLIST_SORT_KEYS).catch("priority")),
  dir: z.preprocess(firstValue, z.enum(["asc", "desc"]).catch("asc")),
});

export type RawWatchlistQuery = Record<string, string | string[] | undefined>;

export function parseWatchlistQuery(raw: RawWatchlistQuery) {
  const parsed = watchlistQuerySchema.parse(raw);

  return {
    q: parsed.q ?? "",
    market: parsed.market,
    status: parsed.status,
    view: parsed.view,
    staleOnly: parsed.stale === "1",
    unmonitoredOnly: parsed.unmonitored === "1",
    sort: parsed.sort,
    direction: parsed.dir,
  };
}
