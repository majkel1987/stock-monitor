"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  submitManualQuoteAction,
  type ManualQuoteActionState,
} from "@/app/(app)/stocks/actions";
import { Field, controlClass } from "@/components/ui/terminal";

const initialState: ManualQuoteActionState = { status: "idle" };

function localDateTimeValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function localValueToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function ManualQuoteDialog({
  stockId,
  marketCode,
  ticker,
  currency,
  currentPrice,
}: {
  stockId: string;
  marketCode: "GPW" | "USA";
  ticker: string;
  currency: "PLN" | "USD";
  currentPrice: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [asOf, setAsOf] = useState(() => localDateTimeValue());
  const [state, action, pending] = useActionState(
    submitManualQuoteAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state.status]);

  return (
    <>
      <button
        className="flex h-8 items-center rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        onClick={() => {
          setAsOf(localDateTimeValue());
          dialogRef.current?.showModal();
        }}
        type="button"
      >
        Set price
      </button>
      <dialog
        aria-labelledby="manual-quote-title"
        className="m-auto w-[420px] rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/65"
        ref={dialogRef}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 id="manual-quote-title" className="text-base font-semibold">
            Manual quote · {ticker}
          </h2>
          <button
            aria-label="Close manual quote dialog"
            className="grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p className="px-4 pt-2 text-[11px] text-[var(--text-secondary)]">
          A newer manual quote becomes the current quote. Research history is
          never changed.
        </p>
        <form action={action} className="flex flex-col gap-3 p-4" ref={formRef}>
          <input name="stockId" type="hidden" value={stockId} />
          <input name="marketCode" type="hidden" value={marketCode} />
          <input name="ticker" type="hidden" value={ticker} />
          <input name="currency" type="hidden" value={currency} />
          <input name="asOf" type="hidden" value={localValueToIso(asOf)} />
          <div className="grid grid-cols-[1fr_170px] gap-3">
            <Field label={`Price · ${currency}`}>
              <input
                className={controlClass}
                defaultValue={currentPrice ?? ""}
                inputMode="decimal"
                name="price"
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="As of">
              <input
                className={controlClass}
                onChange={(event) => setAsOf(event.target.value)}
                required
                type="datetime-local"
                value={asOf}
              />
            </Field>
          </div>
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
              className="h-8 rounded-[5px] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-8 rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending ? "Saving…" : "Save quote"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
