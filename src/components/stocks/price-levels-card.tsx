import type {
  PriceLevelView,
  StockResearchDetail,
} from "@/application/stocks/research-types";
import { SectionHeader, StatusBadge, Surface } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

import {
  formatMoney,
  quoteStatusPresentation,
  reachedLabel,
  signedPercent,
} from "./format";

function distanceToneClass(distancePct: number | null) {
  if (distancePct === null) return "text-muted-foreground";
  if (distancePct <= 0) return "text-warning";
  return "text-info";
}

function PriceLevelRow({ level }: { level: PriceLevelView }) {
  return (
    <tr>
      <td>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{level.label}</p>
          <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
            {formatMoney(level.value, level.currency)}
          </p>
        </div>
      </td>
      <td className="text-right">
        <p
          className={cn(
            "font-mono text-sm tabular-nums",
            distanceToneClass(level.distancePct),
          )}
        >
          {level.distancePct === null
            ? "—"
            : `${signedPercent(level.distancePct)}`}
        </p>
        <div className="mt-1 flex justify-end">
          <StatusBadge
            tone={
              level.reached === null
                ? "neutral"
                : level.reached
                  ? "positive"
                  : "neutral"
            }
          >
            {reachedLabel(level.reached)}
          </StatusBadge>
        </div>
      </td>
    </tr>
  );
}

export function PriceLevelsCard({
  detail,
}: {
  detail: Pick<StockResearchDetail, "priceLevels" | "quote">;
}) {
  const quoteStatus = quoteStatusPresentation(detail.quote);
  const hasLevels = detail.priceLevels.length > 0;

  return (
    <Surface>
      <SectionHeader
        meta={
          detail.quote ? (
            <span className="font-mono tabular-nums">
              {formatMoney(detail.quote.price, detail.quote.currency)}
            </span>
          ) : (
            <span>{quoteStatus.label}</span>
          )
        }
        title="Price levels"
      />
      {hasLevels ? (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Level</th>
                <th className="text-right" scope="col">
                  Distance
                </th>
              </tr>
            </thead>
            <tbody>
              {detail.priceLevels.map((level) => (
                <PriceLevelRow key={level.id} level={level} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-4 text-sm leading-relaxed text-muted-foreground sm:p-5">
          No price levels configured.
        </p>
      )}
      {!detail.quote && hasLevels ? (
        <p className="border-t border-[var(--border-subtle)] px-4 py-3 text-[0.8125rem] text-muted-foreground sm:px-5">
          Distances use the latest quote. {quoteStatus.description}
        </p>
      ) : null}
    </Surface>
  );
}
