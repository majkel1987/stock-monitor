"use client";

import { Search, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  addProviderStockAction,
  addStockAction,
  searchInstrumentsAction,
  type ProviderSearchActionState,
} from "@/app/(app)/watchlist/actions";
import type { AddStockActionState } from "@/application/watchlist/action-state";
import type {
  MarketDefinition,
  StatusDefinition,
} from "@/application/watchlist/types";
import { Field, controlClass } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

const initialAddState: AddStockActionState = { status: "idle" };
const initialSearchState: ProviderSearchActionState = {
  status: "idle",
  candidates: [],
};

export function AddStockDialog({
  markets,
  statuses,
  providerConfigured,
  compactTrigger = false,
}: {
  markets: MarketDefinition[];
  statuses: StatusDefinition[];
  providerConfigured: boolean;
  compactTrigger?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const manualFormRef = useRef<HTMLFormElement>(null);
  const activeStatuses = statuses.filter((status) => status.isActive);
  const [initialStatusId, setInitialStatusId] = useState(
    activeStatuses[0]?.id ?? "",
  );
  const [searchState, searchAction, searchPending] = useActionState(
    searchInstrumentsAction,
    initialSearchState,
  );
  const [providerState, providerAction, providerPending] = useActionState(
    addProviderStockAction,
    initialAddState,
  );
  const [manualState, manualAction, manualPending] = useActionState(
    addStockAction,
    initialAddState,
  );

  useEffect(() => {
    if (
      providerState.status === "success" ||
      manualState.status === "success"
    ) {
      manualFormRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [manualState.status, providerState.status]);

  const fieldError = (
    field: keyof NonNullable<typeof manualState.fieldErrors>,
  ) => manualState.fieldErrors?.[field]?.[0];

  return (
    <>
      <button
        className={cn(
          compactTrigger
            ? "text-[11px] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
            : "flex h-8 items-center justify-center rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]",
        )}
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        + Add stock
      </button>

      <dialog
        aria-labelledby="add-stock-title"
        className="m-auto max-h-[min(760px,90vh)] w-[520px] overflow-y-auto rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/65"
        ref={dialogRef}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4">
          <div>
            <h2 id="add-stock-title" className="text-base font-semibold">
              Add stock
            </h2>
            <p className="pt-1 text-[11px] text-[var(--text-secondary)]">
              Search EODHD first, or use manual entry as a fallback.
            </p>
          </div>
          <button
            aria-label="Close Add Stock"
            className="grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <Field label="Initial status">
            <select
              className={controlClass}
              disabled={activeStatuses.length === 0}
              onChange={(event) => setInitialStatusId(event.target.value)}
              value={initialStatusId}
            >
              {activeStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>

          <section className="flex flex-col gap-3 rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)] p-3">
            <div>
              <h3 className="text-xs font-semibold">Provider search</h3>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                The exact provider symbol is stored separately from the internal
                ticker.
              </p>
            </div>
            <form
              action={searchAction}
              className="grid grid-cols-[110px_1fr_86px] gap-2"
            >
              <select className={controlClass} name="marketCode" required>
                {markets.map((market) => (
                  <option key={market.code} value={market.code}>
                    {market.code}
                  </option>
                ))}
              </select>
              <input
                className={controlClass}
                disabled={!providerConfigured}
                maxLength={80}
                name="query"
                placeholder="Ticker or company"
                required
              />
              <button
                className="flex h-8 items-center justify-center gap-1.5 rounded-[5px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-2 text-[11px] font-semibold hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  !providerConfigured || searchPending || !initialStatusId
                }
                type="submit"
              >
                <Search aria-hidden="true" className="size-3" />
                {searchPending ? "Searching" : "Search"}
              </button>
            </form>

            {!providerConfigured ? (
              <p className="rounded-[5px] border border-[var(--warning)] bg-[var(--warning-subtle)] p-2 text-[10px] text-[var(--warning)]">
                EODHD is not configured. Manual entry remains available.
              </p>
            ) : null}
            {searchState.message ? (
              <p
                aria-live="polite"
                className={cn(
                  "text-[10px]",
                  searchState.status === "error"
                    ? "text-[var(--negative)]"
                    : "text-[var(--text-secondary)]",
                )}
              >
                {searchState.message}
              </p>
            ) : null}
            {searchState.candidates.length ? (
              <div className="max-h-52 overflow-auto rounded-[5px] border border-[var(--border-subtle)]">
                {searchState.candidates.map((candidate) => (
                  <form
                    action={providerAction}
                    className="flex min-h-12 items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-2 last:border-b-0 hover:bg-[var(--surface-hover)]"
                    key={candidate.providerSymbol}
                  >
                    <input
                      name="marketCode"
                      type="hidden"
                      value={candidate.market}
                    />
                    <input
                      name="providerSymbol"
                      type="hidden"
                      value={candidate.providerSymbol}
                    />
                    <input
                      name="initialStatusId"
                      type="hidden"
                      value={initialStatusId}
                    />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate font-mono text-[11px]">
                        {candidate.ticker}
                        <span className="ml-2 font-sans font-normal text-[var(--text-muted)]">
                          {candidate.market} · {candidate.currency}
                        </span>
                      </strong>
                      <span className="block truncate text-[10px] text-[var(--text-secondary)]">
                        {candidate.name} · {candidate.providerSymbol}
                      </span>
                    </span>
                    <button
                      className="h-7 rounded-[5px] bg-[var(--accent-primary)] px-2.5 text-[10px] font-semibold text-[var(--bg-primary)] disabled:opacity-50"
                      disabled={providerPending || !initialStatusId}
                      type="submit"
                    >
                      Add
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
            {providerState.status === "error" && providerState.message ? (
              <p
                aria-live="polite"
                className="text-[10px] text-[var(--negative)]"
              >
                {providerState.message}
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
            <div>
              <h3 className="text-xs font-semibold">Manual fallback</h3>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                Use when the provider is unavailable or has no suitable listing.
              </p>
            </div>
            <form
              action={manualAction}
              className="flex flex-col gap-3"
              ref={manualFormRef}
            >
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <Field label="Market">
                  <select className={controlClass} name="marketCode" required>
                    {markets.map((market) => (
                      <option key={market.code} value={market.code}>
                        {market.code} · {market.currency}
                      </option>
                    ))}
                  </select>
                  {fieldError("marketCode") ? (
                    <span className="text-[10px] text-[var(--negative)]">
                      {fieldError("marketCode")}
                    </span>
                  ) : null}
                </Field>
                <Field label="Ticker">
                  <input
                    autoCapitalize="characters"
                    className={controlClass}
                    maxLength={24}
                    name="ticker"
                    placeholder="PZU or MSFT"
                    required
                  />
                  {fieldError("ticker") ? (
                    <span className="text-[10px] text-[var(--negative)]">
                      {fieldError("ticker")}
                    </span>
                  ) : null}
                </Field>
              </div>
              <Field label="Company name">
                <input
                  className={controlClass}
                  maxLength={160}
                  name="name"
                  placeholder="Company legal or common name"
                  required
                />
                {fieldError("name") ? (
                  <span className="text-[10px] text-[var(--negative)]">
                    {fieldError("name")}
                  </span>
                ) : null}
              </Field>
              <input
                name="initialStatusId"
                type="hidden"
                value={initialStatusId}
              />
              {manualState.status === "error" && manualState.message ? (
                <p
                  aria-live="polite"
                  className="rounded-[5px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-2 text-[11px] text-[var(--negative)]"
                >
                  {manualState.message}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  className="flex h-8 items-center justify-center rounded-[5px] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  onClick={() => dialogRef.current?.close()}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex h-8 items-center justify-center rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={manualPending || !initialStatusId}
                  type="submit"
                >
                  {manualPending ? "Adding…" : "Add manually"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </dialog>
    </>
  );
}
