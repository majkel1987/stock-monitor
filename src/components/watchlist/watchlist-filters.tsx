"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useTransition } from "react";

import type {
  MarketDefinition,
  StatusDefinition,
  WatchlistQuery,
  WatchlistSortKey,
} from "@/application/watchlist/types";
import { cn } from "@/lib/utils/cn";

function queryParams(query: WatchlistQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.market) params.set("market", query.market);
  if (query.status) params.set("status", query.status);
  if (query.view !== "active") params.set("view", query.view);
  if (query.staleOnly) params.set("stale", "1");
  if (query.unmonitoredOnly) params.set("unmonitored", "1");
  if (query.sort !== "priority") params.set("sort", query.sort);
  if (query.direction !== "asc") params.set("dir", query.direction);
  return params;
}

const selectClass =
  "h-7 appearance-none rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-[9px] text-[10px] text-[var(--text-secondary)] outline-none focus:border-[var(--focus)]";

export function WatchlistFilters({
  query,
  markets,
  statuses,
}: {
  query: WatchlistQuery;
  markets: MarketDefinition[];
  statuses: StatusDefinition[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const update = (changes: Partial<WatchlistQuery>) => {
    const next = { ...query, ...changes };
    const params = queryParams(next);
    startTransition(() => {
      router.replace(params.size ? `/watchlist?${params}` : "/watchlist");
    });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update({ q: String(form.get("q") ?? "").trim() });
  };

  const changeSort = (value: string) => {
    const [sort, direction] = value.split(":") as [
      WatchlistSortKey,
      "asc" | "desc",
    ];
    update({ sort, direction });
  };

  return (
    <div
      aria-busy={pending}
      className={cn(
        "flex h-[42px] items-center gap-2 rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px]",
        pending && "opacity-70",
      )}
    >
      <form
        className="flex h-7 w-[250px] items-center gap-[7px] rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-[9px]"
        onSubmit={submitSearch}
      >
        <Search
          aria-hidden="true"
          className="size-[13px] text-[var(--text-muted)]"
        />
        <input
          aria-label="Filter watchlist"
          className="min-w-0 flex-1 bg-transparent text-[11px] outline-none"
          defaultValue={query.q}
          name="q"
          placeholder="Ticker or company"
          type="search"
        />
      </form>
      <select
        aria-label="Filter by market"
        className={cn(selectClass, "w-[94px]")}
        onChange={(event) =>
          update({
            market:
              event.target.value === "all"
                ? undefined
                : (event.target.value as WatchlistQuery["market"]),
          })
        }
        value={query.market ?? "all"}
      >
        <option value="all">Market: All</option>
        {markets.map((market) => (
          <option key={market.code} value={market.code}>
            Market: {market.code}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by status"
        className={cn(selectClass, "w-[108px]")}
        onChange={(event) =>
          update({ status: event.target.value || undefined })
        }
        value={query.status ?? ""}
      >
        <option value="">Status: All</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.slug}>
            {status.label}
          </option>
        ))}
      </select>
      <button
        className="h-7 cursor-not-allowed rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-[9px] text-[10px] text-[var(--text-disabled)]"
        disabled
        title="Available after Price Levels are implemented"
        type="button"
      >
        Near buy zone
      </button>
      <button
        aria-pressed={query.staleOnly}
        className={cn(
          "h-7 rounded-[5px] border border-[var(--border-default)] px-[9px] text-[10px]",
          query.staleOnly
            ? "bg-[var(--surface-selected)] text-[var(--accent-primary)]"
            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
        )}
        onClick={() => update({ staleOnly: !query.staleOnly })}
        type="button"
      >
        Stale price
      </button>
      <button
        aria-pressed={query.unmonitoredOnly}
        className={cn(
          "h-7 rounded-[5px] border border-[var(--border-default)] px-[9px] text-[10px]",
          query.unmonitoredOnly
            ? "bg-[var(--surface-selected)] text-[var(--accent-primary)]"
            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]",
        )}
        onClick={() => update({ unmonitoredOnly: !query.unmonitoredOnly })}
        type="button"
      >
        No monitoring
      </button>
      <select
        aria-label="Show active or archived stocks"
        className={cn(selectClass, "w-[82px]")}
        onChange={(event) =>
          update({ view: event.target.value as WatchlistQuery["view"] })
        }
        value={query.view}
      >
        <option value="active">Active</option>
        <option value="archived">Archived</option>
        <option value="all">All</option>
      </select>
      <select
        aria-label="Sort watchlist"
        className="ml-auto h-7 w-[124px] appearance-none bg-transparent text-right font-mono text-[10px] text-[var(--accent-primary)] outline-none"
        onChange={(event) => changeSort(event.target.value)}
        value={`${query.sort}:${query.direction}`}
      >
        <option value="priority:asc">Sort: Priority ↑</option>
        <option value="ticker:asc">Ticker A–Z</option>
        <option value="ticker:desc">Ticker Z–A</option>
        <option value="name:asc">Company A–Z</option>
        <option value="name:desc">Company Z–A</option>
        <option value="price:desc">Price high–low</option>
        <option value="price:asc">Price low–high</option>
        <option value="daily_change:desc">Daily % high–low</option>
        <option value="daily_change:asc">Daily % low–high</option>
        <option value="investment_score:desc">Score high–low</option>
        <option value="investment_score:asc">Score low–high</option>
        <option value="status:asc">Status priority</option>
        <option value="last_monitored:desc">Latest monitored</option>
        <option value="last_monitored:asc">Oldest monitored</option>
      </select>
    </div>
  );
}
