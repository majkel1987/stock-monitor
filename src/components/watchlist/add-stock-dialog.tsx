"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  addProviderStockAction,
  addStockAction,
} from "@/app/(app)/watchlist/actions";
import type { AddStockActionState } from "@/application/watchlist/action-state";
import type {
  MarketDefinition,
  StatusDefinition,
} from "@/application/watchlist/types";
import { Field, controlClass } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

const initialAddState: AddStockActionState = { status: "idle" };

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
              Add a USA stock by ticker, or use manual entry as a fallback.
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
              <h3 className="text-xs font-semibold">USA · Automatic</h3>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                Massive verifies the ticker, fetches the company name and loads
                the latest EOD price.
              </p>
            </div>
            <form
              action={providerAction}
              className="grid grid-cols-[1fr_auto] gap-2"
            >
              <input name="marketCode" type="hidden" value="USA" />
              <input
                name="initialStatusId"
                type="hidden"
                value={initialStatusId}
              />
              <input
                autoCapitalize="characters"
                autoComplete="off"
                className={controlClass}
                disabled={!providerConfigured}
                maxLength={16}
                name="providerSymbol"
                placeholder="Ticker, e.g. AAPL"
                required
              />
              <button
                className="flex h-8 items-center justify-center rounded-[5px] bg-[var(--accent-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  !providerConfigured || providerPending || !initialStatusId
                }
                type="submit"
              >
                {providerPending ? "Adding…" : "Add USA stock"}
              </button>
            </form>

            {!providerConfigured ? (
              <p className="rounded-[5px] border border-[var(--warning)] bg-[var(--warning-subtle)] p-2 text-[10px] text-[var(--warning)]">
                Massive is not configured. Manual entry remains available.
              </p>
            ) : null}
            {providerState.status === "error" && providerState.message ? (
              <p
                aria-live="polite"
                className="rounded-[5px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-2 text-[10px] text-[var(--negative)]"
              >
                {providerState.message}
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
            <div>
              <h3 className="text-xs font-semibold">Manual fallback</h3>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                GPW uses imported Stooq CSV files. Manual entry also remains
                available when a provider cannot verify a listing.
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
