"use client";

import { Filter, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useRef, useState, useTransition } from "react";

import type {
  MarketDefinition,
  StatusDefinition,
  WatchlistQuery,
  WatchlistSortKey,
} from "@/application/watchlist/types";
import { ActionButton, controlClass } from "@/components/ui/terminal";
import { useT } from "@/i18n/provider";
import { resolveStatusLabel } from "@/i18n/status";
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

type DraftFilters = Pick<
  WatchlistQuery,
  "market" | "status" | "view" | "staleOnly" | "unmonitoredOnly"
>;

const selectClass = cn(controlClass, "w-auto appearance-none pr-8");

const chipClass =
  "inline-flex min-h-10 items-center rounded-[var(--radius-control)] border px-3 text-sm font-medium transition-colors focus-visible:outline-none";

const chipActiveClass =
  "border-primary/50 bg-primary text-primary-foreground";

const chipInactiveClass =
  "border-border bg-card text-secondary-foreground hover:bg-muted hover:text-foreground";

function draftFromQuery(query: WatchlistQuery): DraftFilters {
  return {
    market: query.market,
    status: query.status,
    view: query.view,
    staleOnly: query.staleOnly,
    unmonitoredOnly: query.unmonitoredOnly,
  };
}

function countActiveFilters(query: WatchlistQuery) {
  let count = 0;
  if (query.market) count += 1;
  if (query.status) count += 1;
  if (query.staleOnly) count += 1;
  if (query.unmonitoredOnly) count += 1;
  if (query.view !== "active") count += 1;
  return count;
}

export function WatchlistFilters({
  query,
  markets,
  statuses,
  action,
}: {
  query: WatchlistQuery;
  markets: MarketDefinition[];
  statuses: StatusDefinition[];
  action?: ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftFilters>(() => draftFromQuery(query));

  const activeFilterCount = useMemo(() => countActiveFilters(query), [query]);

  const navigate = (next: WatchlistQuery) => {
    const params = queryParams(next);
    startTransition(() => {
      router.replace(params.size ? `/watchlist?${params}` : "/watchlist");
    });
  };

  const update = (changes: Partial<WatchlistQuery>) => {
    navigate({ ...query, ...changes });
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

  const openFilters = () => {
    setDraft(draftFromQuery(query));
    dialogRef.current?.showModal();
  };

  const closeFilters = () => {
    dialogRef.current?.close();
  };

  const applyDraft = () => {
    navigate({ ...query, ...draft });
    closeFilters();
  };

  const resetDraft = () => {
    const cleared: DraftFilters = {
      market: undefined,
      status: undefined,
      view: "active",
      staleOnly: false,
      unmonitoredOnly: false,
    };
    setDraft(cleared);
  };

  const clearChip = (changes: Partial<WatchlistQuery>) => {
    update(changes);
  };

  const matchedStatus = statuses.find(
    (status) => status.slug === query.status,
  );
  const statusLabel = matchedStatus
    ? resolveStatusLabel(matchedStatus, t)
    : query.status;

  return (
    <div
      aria-busy={pending}
      className={cn("flex flex-col gap-2", pending && "opacity-70")}
    >
      <div className="overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-3 px-3 py-2.5 md:hidden">
          <form
            className="flex h-10 w-full items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background px-3"
            key={`mobile-search-${query.q}`}
            onSubmit={submitSearch}
          >
            <Search
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
            <input
              aria-label={t("watchlist.searchAria")}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              defaultValue={query.q}
              name="q"
              placeholder={t("watchlist.searchPlaceholder")}
              type="search"
            />
          </form>
          <div className="flex gap-2">
            <button
              className={cn(
                chipClass,
                "flex-1 justify-center gap-2",
                activeFilterCount > 0 ? chipActiveClass : chipInactiveClass,
              )}
              onClick={openFilters}
              type="button"
            >
              <Filter aria-hidden="true" className="size-4" />
              {t("common.filters")}
              {activeFilterCount > 0 ? (
                <span className="rounded-[var(--radius-sm)] bg-card/20 px-1.5 py-0.5 text-[0.75rem] font-semibold">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <select
              aria-label={t("watchlist.sortWatchlist")}
              className={cn(selectClass, "min-w-0 flex-1")}
              onChange={(event) => changeSort(event.target.value)}
              value={`${query.sort}:${query.direction}`}
            >
              <SortOptions />
            </select>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="hidden flex-col gap-3 px-3 py-2.5 md:flex">
          <div className="flex flex-wrap items-center gap-2 lg:gap-3">
            <form
              className="flex h-10 w-full max-w-[20rem] items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background px-3 lg:w-[18rem]"
              key={`desktop-search-${query.q}`}
              onSubmit={submitSearch}
            >
              <Search
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <input
                aria-label={t("watchlist.searchAria")}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                defaultValue={query.q}
                name="q"
                placeholder={t("watchlist.searchPlaceholder")}
                type="search"
              />
            </form>

            <select
              aria-label={t("watchlist.filterByMarket")}
              className={cn(selectClass, "w-[8.5rem]")}
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
              <option value="all">{t("watchlist.allMarkets")}</option>
              {markets.map((market) => (
                <option key={market.code} value={market.code}>
                  {market.code}
                </option>
              ))}
            </select>

            <select
              aria-label={t("watchlist.filterByStatus")}
              className={cn(selectClass, "min-w-[10rem] max-w-[14rem]")}
              onChange={(event) =>
                update({ status: event.target.value || undefined })
              }
              value={query.status ?? ""}
            >
              <option value="">{t("watchlist.allStatuses")}</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.slug}>
                  {resolveStatusLabel(status, t)}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className={cn(
                  chipClass,
                  "cursor-not-allowed opacity-60",
                  chipInactiveClass,
                )}
                disabled
                title={t("watchlist.nearBuyZoneDisabled")}
                type="button"
              >
                {t("watchlist.nearBuyZone")}
              </button>
              <button
                aria-pressed={query.staleOnly}
                className={cn(
                  chipClass,
                  query.staleOnly ? chipActiveClass : chipInactiveClass,
                )}
                onClick={() => update({ staleOnly: !query.staleOnly })}
                type="button"
              >
                {t("watchlist.stalePrice")}
              </button>
              <button
                aria-pressed={query.unmonitoredOnly}
                className={cn(
                  chipClass,
                  query.unmonitoredOnly ? chipActiveClass : chipInactiveClass,
                )}
                onClick={() =>
                  update({ unmonitoredOnly: !query.unmonitoredOnly })
                }
                type="button"
              >
                {t("watchlist.noMonitoring")}
              </button>
            </div>

            <select
              aria-label={t("watchlist.showActiveOrArchived")}
              className={cn(selectClass, "w-[8rem]")}
              onChange={(event) =>
                update({
                  view: event.target.value as WatchlistQuery["view"],
                })
              }
              value={query.view}
            >
              <option value="active">{t("common.active")}</option>
              <option value="archived">{t("common.archived")}</option>
              <option value="all">{t("common.all")}</option>
            </select>

            <select
              aria-label={t("watchlist.sortWatchlist")}
              className={cn(selectClass, "ml-auto min-w-[11rem]")}
              onChange={(event) => changeSort(event.target.value)}
              value={`${query.sort}:${query.direction}`}
            >
              <SortOptions />
            </select>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </div>
      </div>

      {activeFilterCount > 0 || query.q ? (
        <div
          aria-label={t("watchlist.activeFilters")}
          className="flex flex-wrap items-center gap-2"
        >
          {query.q ? (
            <ActiveChip
              label={t("watchlist.searchChip", { query: query.q })}
              onRemove={() => clearChip({ q: "" })}
            />
          ) : null}
          {query.market ? (
            <ActiveChip
              label={query.market}
              onRemove={() => clearChip({ market: undefined })}
            />
          ) : null}
          {query.status && statusLabel ? (
            <ActiveChip
              label={statusLabel}
              onRemove={() => clearChip({ status: undefined })}
            />
          ) : null}
          {query.staleOnly ? (
            <ActiveChip
              label={t("watchlist.stalePrice")}
              onRemove={() => clearChip({ staleOnly: false })}
            />
          ) : null}
          {query.unmonitoredOnly ? (
            <ActiveChip
              label={t("watchlist.noMonitoring")}
              onRemove={() => clearChip({ unmonitoredOnly: false })}
            />
          ) : null}
          {query.view !== "active" ? (
            <ActiveChip
              label={
                query.view === "archived"
                  ? t("common.archived")
                  : t("watchlist.allViews")
              }
              onRemove={() => clearChip({ view: "active" })}
            />
          ) : null}
        </div>
      ) : null}

      <dialog
        aria-labelledby="watchlist-filters-title"
        className="m-auto w-[min(100%,24rem)] rounded-[var(--radius-dialog)] border border-border bg-popover p-0 text-popover-foreground shadow-[var(--shadow-lg)] backdrop:bg-black/55 open:flex open:flex-col"
        ref={dialogRef}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2
            className="text-base font-semibold"
            id="watchlist-filters-title"
          >
            {t("common.filters")}
          </h2>
          <button
            aria-label={t("watchlist.closeFilters")}
            className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={closeFilters}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="ui-label">{t("common.market")}</span>
            <select
              className={selectClass}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  market:
                    event.target.value === "all"
                      ? undefined
                      : (event.target.value as WatchlistQuery["market"]),
                }))
              }
              value={draft.market ?? "all"}
            >
              <option value="all">{t("watchlist.allMarkets")}</option>
              {markets.map((market) => (
                <option key={market.code} value={market.code}>
                  {market.code}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ui-label">{t("common.status")}</span>
            <select
              className={selectClass}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value || undefined,
                }))
              }
              value={draft.status ?? ""}
            >
              <option value="">{t("watchlist.allStatuses")}</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.slug}>
                  {resolveStatusLabel(status, t)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ui-label">{t("watchlist.view")}</span>
            <select
              className={selectClass}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  view: event.target.value as WatchlistQuery["view"],
                }))
              }
              value={draft.view}
            >
              <option value="active">{t("common.active")}</option>
              <option value="archived">{t("common.archived")}</option>
              <option value="all">{t("common.all")}</option>
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span className="ui-label">{t("watchlist.quickFilters")}</span>
            <button
              className={cn(
                chipClass,
                "cursor-not-allowed justify-center opacity-60",
                chipInactiveClass,
              )}
              disabled
              title={t("watchlist.nearBuyZoneDisabled")}
              type="button"
            >
              {t("watchlist.nearBuyZone")}
            </button>
            <button
              aria-pressed={draft.staleOnly}
              className={cn(
                chipClass,
                "justify-center",
                draft.staleOnly ? chipActiveClass : chipInactiveClass,
              )}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  staleOnly: !current.staleOnly,
                }))
              }
              type="button"
            >
              {t("watchlist.stalePrice")}
            </button>
            <button
              aria-pressed={draft.unmonitoredOnly}
              className={cn(
                chipClass,
                "justify-center",
                draft.unmonitoredOnly ? chipActiveClass : chipInactiveClass,
              )}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  unmonitoredOnly: !current.unmonitoredOnly,
                }))
              }
              type="button"
            >
              {t("watchlist.noMonitoring")}
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <ActionButton
            className="flex-1"
            onClick={resetDraft}
            type="button"
            variant="secondary"
          >
            {t("common.reset")}
          </ActionButton>
          <ActionButton
            className="flex-1"
            onClick={applyDraft}
            type="button"
            variant="primary"
          >
            {t("watchlist.applyFilters")}
          </ActionButton>
        </div>
      </dialog>
    </div>
  );
}

function ActiveChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  const t = useT();
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-sm)] border border-border bg-muted px-2.5 text-[0.8125rem] font-medium text-secondary-foreground">
      {label}
      <button
        aria-label={t("watchlist.removeFilter", { label })}
        className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={onRemove}
        type="button"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}

function SortOptions() {
  const t = useT();
  return (
    <>
      <option value="priority:asc">{t("watchlist.sortPriorityAsc")}</option>
      <option value="ticker:asc">{t("watchlist.sortTickerAsc")}</option>
      <option value="ticker:desc">{t("watchlist.sortTickerDesc")}</option>
      <option value="name:asc">{t("watchlist.sortCompanyAsc")}</option>
      <option value="name:desc">{t("watchlist.sortCompanyDesc")}</option>
      <option value="price:desc">{t("watchlist.sortPriceDesc")}</option>
      <option value="price:asc">{t("watchlist.sortPriceAsc")}</option>
      <option value="daily_change:desc">
        {t("watchlist.sortDailyPctDesc")}
      </option>
      <option value="daily_change:asc">
        {t("watchlist.sortDailyPctAsc")}
      </option>
      <option value="investment_score:desc">
        {t("watchlist.sortScoreDesc")}
      </option>
      <option value="investment_score:asc">
        {t("watchlist.sortScoreAsc")}
      </option>
      <option value="status:asc">{t("watchlist.sortStatusPriority")}</option>
      <option value="last_monitored:desc">
        {t("watchlist.sortLatestMonitored")}
      </option>
      <option value="last_monitored:asc">
        {t("watchlist.sortOldestMonitored")}
      </option>
    </>
  );
}
