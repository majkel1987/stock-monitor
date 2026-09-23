import { cn } from "@/lib/utils/cn";

import { emptyValue } from "./format";

export function MonitoringSummaryClamp({
  summary,
  clampLines = 2,
  className,
}: {
  summary: string | null;
  clampLines?: 2 | 3;
  className?: string;
}) {
  if (!summary) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyValue}
      </span>
    );
  }

  return (
    <p
      className={cn(
        "min-w-0 text-sm leading-relaxed text-secondary-foreground",
        clampLines === 3 ? "line-clamp-3" : "line-clamp-2",
        className,
      )}
      title={summary}
    >
      {summary}
    </p>
  );
}
