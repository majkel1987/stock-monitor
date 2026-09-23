import {
  calculatePriceLevelDistance,
  isPriceLevelReached,
} from "@/domain/price-levels/calculations";
import type { MarketDataFreshness } from "@/domain/markets/freshness";
import { classifyMarketDataFreshness } from "@/domain/markets/freshness";
import type { MarketCode } from "@/domain/markets/market";
import type {
  AttentionReason,
  DashboardBuyLevel,
  DashboardBuyLevelSource,
  DashboardData,
  DashboardQuoteFreshness,
  DashboardSourceData,
  DashboardStatusCount,
  DashboardStockSource,
  OpportunityRow,
} from "./types";

export const DEFAULT_NEAR_BUY_THRESHOLD_PCT = 10;
export const DEFAULT_MONITORING_STALE_DAYS = 30;
export const RECENT_MONITORING_LIMIT = 5;
export const CURRENT_OPPORTUNITIES_LIMIT = 5;
export const STATUS_OVERVIEW_LIMIT = 8;
export const CURRENT_OPPORTUNITY_SLUGS = new Set([
  "BUY_CANDIDATE",
  "DEEP_DIVE",
  "WAIT_FOR_CORRECTION",
]);

export function filterDashboardSourceByMarket(
  source: DashboardSourceData,
  market?: MarketCode,
): DashboardSourceData {
  if (!market) return source;

  const stocks = source.stocks.filter((stock) => stock.marketCode === market);
  const stockIds = new Set(stocks.map((stock) => stock.id));

  return {
    ...source,
    stocks,
    recentMonitoring: source.recentMonitoring.filter((row) =>
      stockIds.has(row.stockId),
    ),
  };
}

function compareNullableNumberDescending(
  left: number | null,
  right: number | null,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}

function compareNullableDateDescending(
  left: string | null,
  right: string | null,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return Date.parse(right) - Date.parse(left);
}

function isLevelCurrentlyValid(level: DashboardBuyLevelSource, now: Date) {
  const timestamp = now.getTime();
  return (
    (level.validFrom === null || Date.parse(level.validFrom) <= timestamp) &&
    (level.validTo === null || Date.parse(level.validTo) >= timestamp)
  );
}

function evaluatedLevel(
  stock: DashboardStockSource,
  level: DashboardBuyLevelSource,
): DashboardBuyLevel {
  const comparablePrice =
    stock.quote?.currency === level.currency ? stock.quote.price : null;

  return {
    id: level.id,
    label: level.label,
    value: level.value,
    currency: level.currency,
    distancePct: calculatePriceLevelDistance(comparablePrice, level.value),
    reached: isPriceLevelReached(
      comparablePrice,
      level.value,
      level.triggerDirection,
    ),
  };
}

function levelTieBreak(
  left: DashboardBuyLevelSource,
  right: DashboardBuyLevelSource,
) {
  const leftPriority = left.priority ?? Number.MAX_SAFE_INTEGER;
  const rightPriority = right.priority ?? Number.MAX_SAFE_INTEGER;
  return (
    leftPriority - rightPriority ||
    left.sortOrder - right.sortOrder ||
    left.label.localeCompare(right.label)
  );
}

export function selectNearestBuyLevel(stock: DashboardStockSource, now: Date) {
  const levels = stock.buyLevels.filter(
    (level) =>
      level.currency === stock.currency && isLevelCurrentlyValid(level, now),
  );

  if (!levels.length) return null;

  const evaluated = levels.map((source) => ({
    source,
    level: evaluatedLevel(stock, source),
  }));

  evaluated.sort((left, right) => {
    const reachedOrder =
      (left.level.reached === true ? 0 : left.level.reached === false ? 1 : 2) -
      (right.level.reached === true
        ? 0
        : right.level.reached === false
          ? 1
          : 2);
    const leftDistance = Math.abs(
      left.level.distancePct ?? Number.POSITIVE_INFINITY,
    );
    const rightDistance = Math.abs(
      right.level.distancePct ?? Number.POSITIVE_INFINITY,
    );
    return (
      reachedOrder ||
      leftDistance - rightDistance ||
      levelTieBreak(left.source, right.source)
    );
  });

  return evaluated[0]?.level ?? null;
}

export function selectNearBuyLevel(
  stock: DashboardStockSource,
  now: Date,
  thresholdPct = DEFAULT_NEAR_BUY_THRESHOLD_PCT,
) {
  const candidates = stock.buyLevels
    .filter(
      (level) =>
        level.currency === stock.currency &&
        level.triggerDirection === "lte" &&
        isLevelCurrentlyValid(level, now),
    )
    .map((source) => ({ source, level: evaluatedLevel(stock, source) }))
    .filter(
      ({ level }) =>
        level.reached === false &&
        level.distancePct !== null &&
        level.distancePct < 0 &&
        Math.abs(level.distancePct) <= thresholdPct,
    )
    .sort(
      (left, right) =>
        Math.abs(left.level.distancePct ?? 0) -
          Math.abs(right.level.distancePct ?? 0) ||
        levelTieBreak(left.source, right.source),
    );

  return candidates[0]?.level ?? null;
}

export function compareOpportunities(
  left: OpportunityRow,
  right: OpportunityRow,
) {
  const groupOrder =
    (left.status.dashboardGroup === "opportunity" ? 0 : 1) -
    (right.status.dashboardGroup === "opportunity" ? 0 : 1);
  const reachedOrder =
    (left.nearestBuyLevel?.reached === true
      ? 0
      : left.nearestBuyLevel?.reached === false
        ? 1
        : 2) -
    (right.nearestBuyLevel?.reached === true
      ? 0
      : right.nearestBuyLevel?.reached === false
        ? 1
        : 2);
  const leftDistance = Math.abs(
    left.nearestBuyLevel?.distancePct ?? Number.POSITIVE_INFINITY,
  );
  const rightDistance = Math.abs(
    right.nearestBuyLevel?.distancePct ?? Number.POSITIVE_INFINITY,
  );

  return (
    groupOrder ||
    reachedOrder ||
    leftDistance - rightDistance ||
    compareNullableNumberDescending(
      left.investmentScore,
      right.investmentScore,
    ) ||
    compareNullableDateDescending(left.lastAnalysisAt, right.lastAnalysisAt) ||
    left.status.sortOrder - right.status.sortOrder ||
    left.ticker.localeCompare(right.ticker)
  );
}

function attentionReasons(
  stock: DashboardStockSource,
  now: Date,
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const monitoring = stock.latestMonitoring;
  const staleCutoff = new Date(now);
  staleCutoff.setUTCDate(
    staleCutoff.getUTCDate() - DEFAULT_MONITORING_STALE_DAYS,
  );

  if (!monitoring) reasons.push("no_monitoring");
  else if (Date.parse(monitoring.analyzedAt) < staleCutoff.getTime()) {
    reasons.push("stale_monitoring");
  }

  if (!stock.quote) reasons.push("missing_price");
  else if (stock.quote.qualityStatus.trim().toLowerCase() === "stale") {
    reasons.push("stale_price");
  }

  return reasons;
}

const attentionPriority: Record<AttentionReason, number> = {
  no_monitoring: 0,
  stale_monitoring: 1,
  missing_price: 2,
  stale_price: 3,
};

export function buildDashboardData(
  source: DashboardSourceData,
  now = new Date(),
): DashboardData {
  const stocks = source.stocks.map((stock) => ({
    ...stock,
    quote: stock.quote
      ? {
          ...stock.quote,
          qualityStatus: classifyMarketDataFreshness({
            market: stock.marketCode,
            asOf: stock.quote.asOf,
            now,
          }),
        }
      : null,
  }));
  const stockById = new Map(stocks.map((stock) => [stock.id, stock]));
  const opportunities = stocks
    .map((stock): OpportunityRow => ({
      stockId: stock.id,
      ticker: stock.ticker,
      name: stock.name,
      marketCode: stock.marketCode,
      currency: stock.currency,
      status: stock.status,
      quote: stock.quote,
      investmentScore: stock.latestMonitoring?.investmentScore ?? null,
      nearestBuyLevel: selectNearestBuyLevel(stock, now),
      lastAnalysisAt: stock.latestMonitoring?.analyzedAt ?? null,
    }))
    .sort(compareOpportunities);

  const nearBuyZone = stocks
    .flatMap((stock) => {
      if (!stock.quote) return [];
      const level = selectNearBuyLevel(stock, now);
      return level
        ? [
            {
              stockId: stock.id,
              ticker: stock.ticker,
              name: stock.name,
              marketCode: stock.marketCode,
              currentPrice: stock.quote.price,
              currency: stock.currency,
              level,
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        Math.abs(left.level.distancePct ?? 0) -
          Math.abs(right.level.distancePct ?? 0) ||
        left.ticker.localeCompare(right.ticker),
    );

  const needsAttention = stocks
    .flatMap((stock) => {
      const reasons = attentionReasons(stock, now);
      return reasons.length
        ? [
            {
              stockId: stock.id,
              ticker: stock.ticker,
              name: stock.name,
              marketCode: stock.marketCode,
              reasons,
              lastAnalysisAt: stock.latestMonitoring?.analyzedAt ?? null,
            },
          ]
        : [];
    })
    .sort((left, right) => {
      const leftPriority = Math.min(
        ...left.reasons.map((reason) => attentionPriority[reason]),
      );
      const rightPriority = Math.min(
        ...right.reasons.map((reason) => attentionPriority[reason]),
      );
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      if (left.lastAnalysisAt === null && right.lastAnalysisAt !== null)
        return -1;
      if (right.lastAnalysisAt === null && left.lastAnalysisAt !== null)
        return 1;
      return (
        (left.lastAnalysisAt && right.lastAnalysisAt
          ? Date.parse(left.lastAnalysisAt) - Date.parse(right.lastAnalysisAt)
          : 0) || left.ticker.localeCompare(right.ticker)
      );
    });

  const recentMonitoring = [...source.recentMonitoring]
    .sort(
      (left, right) =>
        Date.parse(right.analyzedAt) - Date.parse(left.analyzedAt) ||
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, RECENT_MONITORING_LIMIT)
    .flatMap((monitoring) => {
      const stock = stockById.get(monitoring.stockId);
      return stock
        ? [
            {
              id: monitoring.id,
              stockId: stock.id,
              ticker: stock.ticker,
              name: stock.name,
              marketCode: stock.marketCode,
              analyzedAt: monitoring.analyzedAt,
              status: monitoring.status,
              previousStatus: monitoring.previousStatus,
              investmentScore: monitoring.investmentScore,
              previousInvestmentScore: monitoring.previousInvestmentScore,
              recommendation: monitoring.recommendation,
              summary: monitoring.summary,
              price: monitoring.price,
              currency: monitoring.currency,
            },
          ]
        : [];
    });

  const latestQuoteAsOf = stocks.reduce<string | null>((latest, stock) => {
    const current = stock.quote?.asOf ?? null;
    if (!current) return latest;
    return latest === null || Date.parse(current) > Date.parse(latest)
      ? current
      : latest;
  }, null);

  const lastAnalysisAt = stocks.reduce<string | null>((latest, stock) => {
    const current = stock.latestMonitoring?.analyzedAt ?? null;
    if (!current) return latest;
    return latest === null || Date.parse(current) > Date.parse(latest)
      ? current
      : latest;
  }, null);

  const marketOverview = {
    all: stocks.length,
    opportunity: stocks.filter(
      (stock) => stock.status.dashboardGroup === "opportunity",
    ).length,
    watch: stocks.filter((stock) => stock.status.dashboardGroup === "watch")
      .length,
    research: stocks.filter(
      (stock) => stock.status.dashboardGroup === "research",
    ).length,
    portfolio: stocks.filter(
      (stock) => stock.status.dashboardGroup === "portfolio",
    ).length,
    stale: stocks.filter(
      (stock) => stock.quote?.qualityStatus.trim().toLowerCase() === "stale",
    ).length,
    gpw: stocks.filter((stock) => stock.marketCode === "GPW").length,
    usa: stocks.filter((stock) => stock.marketCode === "USA").length,
  };

  return {
    marketOverview,
    kpis: {
      monitored: marketOverview.all,
      gpw: marketOverview.gpw,
      usa: marketOverview.usa,
      buyCandidates: countBySlugOrGroup(stocks, "BUY_CANDIDATE", "opportunity"),
      deepDive: countBySlugOrGroup(stocks, "DEEP_DIVE", "research"),
      portfolio: countBySlugOrGroup(stocks, "PORTFOLIO", "portfolio"),
      needsAttention: needsAttention.length,
      lastAnalysisAt,
    },
    statusOverview: buildStatusOverview(stocks),
    opportunities,
    currentOpportunities: opportunities
      .filter((row) => CURRENT_OPPORTUNITY_SLUGS.has(row.status.slug))
      .slice(0, CURRENT_OPPORTUNITIES_LIMIT),
    nearBuyZone,
    needsAttention,
    recentMonitoring,
    quoteFreshness: summarizeQuoteFreshness(stocks, latestQuoteAsOf),
    metadata: {
      generatedAt: now.toISOString(),
      lastQuoteAsOf: latestQuoteAsOf,
      lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
    },
  };
}

function countBySlugOrGroup(
  stocks: DashboardStockSource[],
  slug: string,
  group: DashboardStockSource["status"]["dashboardGroup"],
) {
  return stocks.filter(
    (stock) =>
      stock.status.slug === slug || stock.status.dashboardGroup === group,
  ).length;
}

function buildStatusOverview(
  stocks: DashboardStockSource[],
): DashboardStatusCount[] {
  const counts = new Map<string, DashboardStatusCount>();

  for (const stock of stocks) {
    const existing = counts.get(stock.status.id);
    if (existing) {
      existing.count += 1;
      continue;
    }
    counts.set(stock.status.id, { status: stock.status, count: 1 });
  }

  return [...counts.values()]
    .filter((row) => row.count > 0)
    .sort(
      (left, right) =>
        left.status.sortOrder - right.status.sortOrder ||
        left.status.label.localeCompare(right.status.label),
    )
    .slice(0, STATUS_OVERVIEW_LIMIT);
}

function freshnessRank(status: MarketDataFreshness) {
  if (status === "stale") return 0;
  if (status === "unknown") return 1;
  if (status === "delayed") return 2;
  if (status === "closed") return 3;
  return 4;
}

function summarizeQuoteFreshness(
  stocks: DashboardStockSource[],
  lastQuoteAsOf: string | null,
): DashboardQuoteFreshness {
  const quotes = stocks.flatMap((stock) => (stock.quote ? [stock.quote] : []));
  if (!quotes.length) {
    return { status: "unavailable", lastQuoteAsOf };
  }

  const worst = quotes.reduce((current, quote) =>
    freshnessRank(quote.qualityStatus) < freshnessRank(current.qualityStatus)
      ? quote
      : current,
  ).qualityStatus;

  if (worst === "stale") return { status: "stale", lastQuoteAsOf };
  if (worst === "unknown") return { status: "unavailable", lastQuoteAsOf };
  if (worst === "delayed" || worst === "closed") {
    return { status: "delayed", lastQuoteAsOf };
  }
  return { status: "current", lastQuoteAsOf };
}
