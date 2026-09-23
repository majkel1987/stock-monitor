"use client";

import Link from "next/link";

import type { DashboardMarketFilter } from "@/application/dashboard/market-query";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

export function DashboardMarketFilter({
  value,
}: {
  value: DashboardMarketFilter;
}) {
  const t = useT();

  const filters: ReadonlyArray<{
    id: DashboardMarketFilter;
    href: string;
    label: string;
  }> = [
    { id: "ALL", href: "/dashboard", label: t("filters.all") },
    { id: "GPW", href: "/dashboard?market=GPW", label: t("filters.gpw") },
    { id: "USA", href: "/dashboard?market=USA", label: t("filters.usa") },
  ];

  return (
    <nav
      aria-label={t("filters.market")}
      className="grid w-full grid-cols-3 rounded-[var(--radius-control)] border border-border bg-card p-0.5 min-[360px]:w-auto"
    >
      {filters.map((filter) => {
        const active = filter.id === value;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center justify-center rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-secondary-foreground hover:bg-muted hover:text-foreground",
            )}
            href={filter.href}
            key={filter.id}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
