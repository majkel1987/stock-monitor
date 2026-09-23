import Link from "next/link";

import type { MonitoringHistoryItem } from "@/application/stocks/research-types";
import {
  EmptyState,
  MetricCard,
  SectionHeader,
  Surface,
} from "@/components/ui/terminal";

import {
  dateFormatter,
  emptyValue,
  formatAsymmetry,
  formatDecision,
  formatMoney,
  formatPercentValue,
  formatEntryZone,
} from "./format";

export function LatestAnalysisCard({
  monitoring,
  currency,
}: {
  monitoring: MonitoringHistoryItem | null;
  currency: string;
}) {
  if (!monitoring) {
    return (
      <Surface>
        <SectionHeader title="Latest analysis" />
        <EmptyState
          description="No analysis recorded yet. Create the first monitoring snapshot to capture decision, score and valuation."
          title="No analysis yet"
        />
      </Surface>
    );
  }

  const openLink = (
    <Link
      className="inline-flex min-h-9 items-center text-sm font-semibold text-primary hover:underline"
      href={`/monitoring/${monitoring.id}`}
    >
      Open full analysis →
    </Link>
  );

  if (!monitoring.analysisDetails) {
    return (
      <Surface>
        <SectionHeader meta={openLink} title="Latest analysis" />
        <div className="flex flex-col gap-2 p-4 sm:p-5">
          <p className="ui-meta">
            {dateFormatter.format(new Date(monitoring.analyzedAt))}
          </p>
          <p className="text-base font-semibold">
            {monitoring.recommendation ?? monitoring.status.label}
          </p>
          <p className="max-w-[65ch] text-sm leading-relaxed text-secondary-foreground">
            {monitoring.summary ?? "No summary recorded."}
          </p>
        </div>
      </Surface>
    );
  }

  const items = [
    {
      label: "Decision",
      value: formatDecision(monitoring.decisionAction),
    },
    {
      label: "Investment score",
      value: monitoring.scores.investment?.toString() ?? emptyValue,
    },
    {
      label: "Fair value",
      value: monitoring.baseFairValue
        ? formatMoney(monitoring.baseFairValue, currency)
        : emptyValue,
    },
    {
      label: "Entry zone",
      value: formatEntryZone(
        monitoring.entryZoneFrom,
        monitoring.entryZoneTo,
        monitoring.entryZoneCurrency,
        currency,
      ),
    },
    {
      label: "Potential",
      value: formatPercentValue(monitoring.baseTotalReturnPct),
    },
    {
      label: "Asymmetry",
      value: formatAsymmetry(monitoring.asymmetryRatio),
    },
  ] as const;

  return (
    <Surface>
      <SectionHeader meta={openLink} title="Latest analysis" />
      <div className="grid grid-cols-2 gap-3 p-4 sm:p-5 lg:grid-cols-3">
        {items.map((item) => (
          <MetricCard
            className="shadow-none"
            key={item.label}
            label={item.label}
            value={
              <span className="font-mono text-lg tracking-tight tabular-nums sm:text-xl">
                {item.value}
              </span>
            }
          />
        ))}
      </div>
    </Surface>
  );
}
