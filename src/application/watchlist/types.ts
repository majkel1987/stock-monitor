import type { MarketCode } from "@/domain/markets/market";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import type { InstrumentCandidate } from "@/application/sync/market-data-provider";

export const WATCHLIST_SORT_KEYS = [
  "priority",
  "ticker",
  "name",
  "price",
  "daily_change",
  "status",
  "investment_score",
  "last_monitored",
] as const;

export type WatchlistSortKey = (typeof WATCHLIST_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";
export type WatchlistView = "active" | "archived" | "all";

export type WatchlistQuery = {
  q: string;
  market?: MarketCode;
  status?: string;
  view: WatchlistView;
  staleOnly: boolean;
  unmonitoredOnly: boolean;
  sort: WatchlistSortKey;
  direction: SortDirection;
};

export type StatusDefinition = {
  id: string;
  slug: string;
  label: string;
  colorToken: string;
  dashboardGroup: string;
  sortOrder: number;
  isActive: boolean;
};

export type MarketDefinition = {
  code: MarketCode;
  name: string;
  currency: string;
};

export type WatchlistRow = {
  watchlistItemId: string;
  stockId: string;
  ticker: string;
  name: string;
  market: MarketDefinition;
  currency: string;
  dataMode: "manual" | "provider";
  status: StatusDefinition;
  price: {
    value: string;
    dayChangePct: string | null;
    asOf: string;
    provider: string;
    qualityStatus: MarketDataFreshness;
  } | null;
  lastMonitoring: {
    analyzedAt: string;
    investmentScore: number | null;
  } | null;
  displayOrder: number | null;
  archivedAt: string | null;
};

export type WatchlistSummary = {
  active: number;
  gpw: number;
  usa: number;
};

export type WatchlistData = {
  rows: WatchlistRow[];
  statuses: StatusDefinition[];
  markets: MarketDefinition[];
  summary: WatchlistSummary;
};

export interface WatchlistReader {
  read(userId: string, query: WatchlistQuery): Promise<WatchlistData>;
}

export type AddStockInput = {
  marketCode: MarketCode;
  ticker: string;
  name: string;
  initialStatusId: string;
};

export type AddStockResult =
  | {
      status: "created" | "restored" | "already_active";
      stockId: string;
    }
  | {
      status:
        | "invalid_market"
        | "invalid_status"
        | "invalid_candidate"
        | "mapping_conflict"
        | "conflict";
    };

export interface WatchlistWriter {
  addManualStock(userId: string, input: AddStockInput): Promise<AddStockResult>;
  addProviderStock(
    userId: string,
    candidate: InstrumentCandidate,
    initialStatusId: string,
  ): Promise<AddStockResult>;
  archive(userId: string, watchlistItemId: string): Promise<boolean>;
  restore(userId: string, watchlistItemId: string): Promise<boolean>;
}
