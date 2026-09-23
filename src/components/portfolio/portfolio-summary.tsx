import type { PortfolioData } from "@/application/portfolio/types";
import { MetricCard, MetricStrip } from "@/components/ui/terminal";
import {
  formatMoney,
  formatPercent,
  formatSignedMoney,
  resultMetricTone,
} from "./format";

export function PortfolioSummary({
  summary,
}: {
  summary: PortfolioData["summary"];
}) {
  return (
    <MetricStrip label="Portfolio summary">
      <MetricCard
        embedded
        label="Portfolio value"
        value={
          <span className="font-mono">
            {formatMoney(summary.currentValuePln, "PLN")}
          </span>
        }
      />
      <MetricCard
        embedded
        label="Total return"
        tone={resultMetricTone(summary.returnPercent)}
        value={
          <span className="font-mono">
            {formatPercent(summary.returnPercent)}
          </span>
        }
      />
      <MetricCard
        embedded
        label="Profit / Loss"
        tone={resultMetricTone(summary.profitLossPln)}
        value={
          <span className="font-mono">
            {formatSignedMoney(summary.profitLossPln, "PLN")}
          </span>
        }
      />
      <MetricCard
        embedded
        label="Invested"
        value={
          <span className="font-mono">
            {formatMoney(summary.totalCostBasisPln, "PLN")}
          </span>
        }
      />
    </MetricStrip>
  );
}
