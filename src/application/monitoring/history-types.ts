import type { MonitoringImportCompany } from "@/application/imports/types";

export type MonitoringTimelineItem = {
  id: string;
  analyzedAt: string;
  ticker: string;
  companyName: string;
  marketCode: string;
  price: string | null;
  currency: string;
  statusSlug: string;
  statusLabel: string;
  investmentScore: number | null;
  decisionAction: string | null;
  summary: string | null;
  sourceType: string;
};

export type MonitoringDetail = MonitoringTimelineItem & {
  priceAsOf: string | null;
  currentPrice: string | null;
  currentPriceAsOf: string | null;
  decisionReason: string | null;
  opportunityCategory: string | null;
  analysisDate: string | null;
  sourceReference: string | null;
  analysis: MonitoringImportCompany | null;
};
