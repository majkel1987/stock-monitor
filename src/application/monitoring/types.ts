import type { MonitoringScores } from "@/domain/monitoring/calculations";

export type CreateMonitoringInput = {
  stockId: string;
  statusDefinitionId: string;
  analyzedAt: string;
  scores: MonitoringScores;
  recommendation: string | null;
  summary: string | null;
  pros: string[];
  risks: string[];
  price: number;
  currency: "PLN" | "USD";
  priceAsOf: string;
  fxUsdPln: number | null;
  sourceReference: string | null;
  supersedesId: string | null;
  thesis: {
    summary: string | null;
    bullCase: string | null;
    baseCase: string | null;
    bearCase: string | null;
    catalysts: string[];
    keyRisks: string[];
    killCriteria: string[];
  };
};

export type CreateMonitoringResult =
  | { status: "created"; monitoringResultId: string }
  | {
      status:
        | "invalid_stock"
        | "invalid_status"
        | "invalid_currency"
        | "invalid_fx"
        | "invalid_supersedes";
    };

export interface MonitoringWriter {
  create(
    userId: string,
    input: CreateMonitoringInput,
  ): Promise<CreateMonitoringResult>;
}
