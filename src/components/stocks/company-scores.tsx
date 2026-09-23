import type { MonitoringHistoryItem } from "@/application/stocks/research-types";
import { Surface } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

import { emptyValue } from "./format";

const SCORE_ITEMS = [
  ["Investment", "investment"],
  ["Quality", "quality"],
  ["Valuation", "valuation"],
  ["Momentum", "momentum"],
  ["Risk safety", "riskSafety"],
] as const;

function ScoreMeter({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;

  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      aria-label={`${label} score ${value} of 100`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted"
      role="meter"
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function CompanyScores({
  monitoring,
}: {
  monitoring: MonitoringHistoryItem | null;
}) {
  return (
    <Surface className="p-4 sm:p-5">
      <h2 className="sr-only">Scores</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {SCORE_ITEMS.map(([label, key]) => {
          const value = monitoring?.scores[key] ?? null;
          return (
            <div className="min-w-0" key={key}>
              <p className="ui-meta font-medium tracking-wide uppercase">
                {label}
              </p>
              <p
                className={cn(
                  "mt-1 font-mono text-xl font-semibold tracking-tight tabular-nums",
                  value === null ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {value ?? emptyValue}
              </p>
              <ScoreMeter label={label} value={value} />
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
