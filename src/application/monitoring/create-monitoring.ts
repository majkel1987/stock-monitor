import type { ParsedMonitoringInput } from "./schemas";
import type { MonitoringWriter } from "./types";

export function createMonitoring(
  writer: MonitoringWriter,
  userId: string,
  input: ParsedMonitoringInput,
) {
  return writer.create(userId, {
    stockId: input.stockId,
    statusDefinitionId: input.statusDefinitionId,
    analyzedAt: input.analyzedAt,
    scores: {
      investment: input.investmentScore,
      quality: input.qualityScore,
      valuation: input.valuationScore,
      momentum: input.momentumScore,
      riskSafety: input.riskScore,
    },
    recommendation: input.recommendation,
    summary: input.summary,
    pros: input.pros,
    risks: input.risks,
    price: input.price,
    currency: input.currency,
    priceAsOf: input.priceAsOf,
    fxUsdPln: input.fxUsdPln,
    sourceReference: input.sourceReference,
    supersedesId: input.supersedesId,
    thesis: {
      summary: input.thesisSummary,
      bullCase: input.bullCase,
      baseCase: input.baseCase,
      bearCase: input.bearCase,
      catalysts: input.catalysts,
      keyRisks: input.risks,
      killCriteria: input.killCriteria,
    },
  });
}
