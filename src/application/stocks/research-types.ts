import type { MarketCode } from "@/domain/markets/market";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import type {
  MonitoringScoreDeltas,
  MonitoringScores,
} from "@/domain/monitoring/calculations";
import type { PriceLevelTriggerDirection } from "@/domain/price-levels/calculations";

export type ResearchStatus = {
  id: string;
  slug: string;
  label: string;
  colorToken: string;
  sortOrder: number;
  isActive: boolean;
};

export type MonitoringHistoryItem = {
  id: string;
  analyzedAt: string;
  createdAt: string;
  status: ResearchStatus;
  scores: MonitoringScores;
  recommendation: string | null;
  summary: string | null;
  pros: string[];
  risks: string[];
  price: string;
  currency: string;
  priceAsOf: string;
  fxUsdPln: string | null;
  pricePln: string | null;
  sourceType: "manual" | "json_import" | "api_import";
  sourceReference: string | null;
  supersedesId: string | null;
  isSuperseded: boolean;
  comparison: {
    previousId: string;
    previousStatus: ResearchStatus;
    priceDelta: number;
    scoreDeltas: MonitoringScoreDeltas;
  } | null;
};

export type ThesisSummary = {
  id: string;
  monitoringResultId: string;
  summary: string | null;
  bullCase: string | null;
  baseCase: string | null;
  bearCase: string | null;
  catalysts: string[];
  keyRisks: string[];
  killCriteria: string[];
  createdAt: string;
};

export type PriceLevelView = {
  id: string;
  label: string;
  kind: "buy" | "fair_value" | "sell" | "custom";
  value: string;
  currency: string;
  triggerDirection: PriceLevelTriggerDirection;
  priority: number | null;
  sortOrder: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
  note: string | null;
  distancePct: number | null;
  reached: boolean | null;
};

export type NoteView = {
  id: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockResearchDetail = {
  stock: {
    id: string;
    ticker: string;
    name: string;
    marketCode: MarketCode;
    marketName: string;
    exchange: string;
    currency: string;
    dataMode: "manual" | "provider";
  };
  watchlistItem: { id: string; archivedAt: string | null };
  currentStatus: ResearchStatus;
  availableStatuses: ResearchStatus[];
  quote: {
    price: string;
    currency: string;
    dayChangePct: string | null;
    asOf: string;
    provider: string;
    qualityStatus: MarketDataFreshness;
  } | null;
  latestMonitoring: MonitoringHistoryItem | null;
  latestThesis: ThesisSummary | null;
  priceLevels: PriceLevelView[];
  monitoringHistory: MonitoringHistoryItem[];
  notes: NoteView[];
};

export interface StockResearchReader {
  read(
    userId: string,
    marketCode: MarketCode,
    ticker: string,
  ): Promise<StockResearchDetail | null>;
}
