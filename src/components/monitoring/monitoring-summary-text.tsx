"use client";

import { useState } from "react";

import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

import { emptyValue } from "./format";

export function MonitoringSummaryText({
  summary,
  clampLines = 2,
  className,
}: {
  summary: string | null;
  clampLines?: 2 | 3;
  className?: string;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  if (!summary) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {emptyValue}
      </span>
    );
  }

  const clampClass = clampLines === 3 ? "line-clamp-3" : "line-clamp-2";

  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "text-sm leading-relaxed text-secondary-foreground",
          !expanded && clampClass,
        )}
        title={summary}
      >
        {summary}
      </p>
      {summary.length > 120 ? (
        <button
          aria-expanded={expanded}
          className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          type="button"
        >
          {expanded ? t("monitoring.showLess") : t("monitoring.showMore")}
        </button>
      ) : null}
    </div>
  );
}
