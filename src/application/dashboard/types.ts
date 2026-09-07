import type { MarketCode } from "@/domain/markets/market";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import type { PriceLevelTriggerDirection } from "@/domain/price-levels/calculations";

export type DashboardGroup =
  "opportunity" | "watch" | "research" | "portfolio" | "negative" | "other";

export type DashboardStatus = {
  id: string;
  slug: string;
  label: string;
  colorToken: string;
  dashboardGroup: DashboardGroup;
  sortOrder: number;
};

export type DashboardQuote = {
  price: string;
  currency: string;
  dayChangePct: string | null;
  asOf: string;
  provider: string;
  qualityStatus: MarketDataFreshness;
};

export type DashboardMonitoringSource = {
  id: string;
  stockId: string;
  analyzedAt: string;
  createdAt: string;
  status: DashboardStatus;
  previousStatus: DashboardStatus | null;
  investmentScore: number | null;
  previousInvestmentScore: number | null;
  recommendation: string | null;
  summary: string | null;
  price: string;
  currency: string;
  stockRank: number;
  recentRank: number;
};

export type DashboardBuyLevelSource = {
  id: string;
  stockId: string;
  label: string;
  value: string;
  currency: string;
  triggerDirection: PriceLevelTriggerDirection;
  priority: number | null;
  sortOrder: number;
  validFrom: string | null;
  validTo: string | null;
};

export type DashboardStockSource = {
  id: string;
  ticker: string;
  name: string;
  marketCode: MarketCode;
  currency: string;
  status: DashboardStatus;
  quote: DashboardQuote | null;
  latestMonitoring: DashboardMonitoringSource | null;
  buyLevels: DashboardBuyLevelSource[];
};

export type DashboardSourceData = {
  stocks: DashboardStockSource[];
  recentMonitoring: DashboardMonitoringSource[];
  lastSuccessfulSyncAt: string | null;
};

export type DashboardBuyLevel = {
  id: string;
  label: string;
  value: string;
  currency: string;
  distancePct: number | null;
  reached: boolean | null;
};

export type OpportunityRow = {
  stockId: string;
  ticker: string;
  name: string;
  marketCode: MarketCode;
  currency: string;
  status: DashboardStatus;
  quote: DashboardQuote | null;
  investmentScore: number | null;
  nearestBuyLevel: DashboardBuyLevel | null;
  lastAnalysisAt: string | null;
};

export type NearBuyRow = {
  stockId: string;
  ticker: string;
  name: string;
  marketCode: MarketCode;
  currentPrice: string;
  currency: string;
  level: DashboardBuyLevel;
};

export type AttentionReason =
  "no_monitoring" | "stale_monitoring" | "missing_price" | "stale_price";

export type NeedsAttentionRow = {
  stockId: string;
  ticker: string;
  name: string;
  marketCode: MarketCode;
  reasons: AttentionReason[];
  lastAnalysisAt: string | null;
};

export type RecentMonitoringRow = {
  id: string;
  stockId: string;
  ticker: string;
  name: string;
  marketCode: MarketCode;
  analyzedAt: string;
  status: DashboardStatus;
  previousStatus: DashboardStatus | null;
  investmentScore: number | null;
  previousInvestmentScore: number | null;
  recommendation: string | null;
  summary: string | null;
  price: string;
  currency: string;
};

export type DashboardData = {
  marketOverview: {
    all: number;
    opportunity: number;
    watch: number;
    research: number;
    portfolio: number;
    stale: number;
    gpw: number;
    usa: number;
  };
  opportunities: OpportunityRow[];
  nearBuyZone: NearBuyRow[];
  needsAttention: NeedsAttentionRow[];
  recentMonitoring: RecentMonitoringRow[];
  metadata: {
    generatedAt: string;
    lastQuoteAsOf: string | null;
    lastSuccessfulSyncAt: string | null;
  };
};

export interface DashboardReader {
  read(userId: string): Promise<DashboardSourceData>;
}
