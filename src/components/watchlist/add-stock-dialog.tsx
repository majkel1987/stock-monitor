"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { addStockAction } from "@/app/(app)/watchlist/actions";
import type { AddStockActionState } from "@/application/watchlist/action-state";
import type {
  MarketDefinition,
  StatusDefinition,
} from "@/application/watchlist/types";
import { Field, controlClass } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

const initialState: AddStockActionState = { status: "idle" };

export function AddStockDialog({
  markets,
  statuses,
  compactTrigger = false,
}: {
  markets: MarketDefinition[];
  statuses: StatusDefinition[];
  compactTrigger?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    addStockAction,
    initialState,
  );
  const activeStatuses = statuses.filter((status) => status.isActive);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state]);

  const fieldError = (field: keyof NonNullable<typeof state.fieldErrors>) =>
    state.fieldErrors?.[field]?.[0];

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
        className="m-auto w-[460px] rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/65"
        ref={dialogRef}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 id="add-stock-title" className="text-base font-semibold">
            Add stock
          </h2>
          <button
            aria-label="Close Add Stock"
            className="grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p className="px-4 pt-2 text-[11px] leading-[14px] text-[var(--text-secondary)]">
          Add a GPW or US instrument manually. Provider search is not enabled
          yet.
        </p>

        <form
          action={formAction}
          className="flex flex-col gap-3 p-4"
          ref={formRef}
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
          <Field label="Initial status">
            <select
              className={controlClass}
              disabled={activeStatuses.length === 0}
              name="initialStatusId"
              required
            >
              {activeStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
            {fieldError("initialStatusId") ? (
              <span className="text-[10px] text-[var(--negative)]">
                {fieldError("initialStatusId")}
              </span>
            ) : null}
          </Field>

          {activeStatuses.length === 0 ? (
            <p className="rounded-[5px] border border-[var(--warning)] bg-[var(--warning-subtle)] p-2 text-[11px] text-[var(--warning)]">
              Create or initialize an active status before adding a stock.
            </p>
          ) : null}
          {state.status === "error" && state.message ? (
            <p
              aria-live="polite"
              className="rounded-[5px] border border-[var(--negative)] bg-[var(--negative-subtle)] p-2 text-[11px] text-[var(--negative)]"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              className="flex h-8 items-center justify-center rounded-[5px] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex h-8 items-center justify-center rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending || activeStatuses.length === 0}
              type="submit"
            >
              {pending ? "Adding…" : "Add stock"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
