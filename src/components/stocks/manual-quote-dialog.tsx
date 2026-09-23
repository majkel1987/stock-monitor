"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  submitManualQuoteAction,
  type ManualQuoteActionState,
} from "@/app/(app)/stocks/actions";
import { ActionButton, Field, controlClass } from "@/components/ui/terminal";

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
  triggerClassName,
}: {
  stockId: string;
  marketCode: "GPW" | "USA";
  ticker: string;
  currency: "PLN" | "USD";
  currentPrice: string | null;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [asOf, setAsOf] = useState(() => localDateTimeValue());
  const [state, action, pending] = useActionState(
    submitManualQuoteAction,
    initialState,
  );
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }
    if (!wasPendingRef.current) return;
    wasPendingRef.current = false;
    if (state.status !== "success") return;

    toast.success("Quote saved", {
      description: state.message ?? "Manual quote was saved.",
      duration: 3500,
    });
    formRef.current?.reset();
    dialogRef.current?.close();
  }, [pending, state.message, state.status]);

  return (
    <>
      <button
        className={
          triggerClassName ??
          "ui-button ui-button-secondary w-full justify-center lg:w-auto"
        }
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
        className="m-auto w-[min(100%-1.5rem,26.25rem)] rounded-[var(--radius-dialog)] border border-border bg-popover p-0 text-popover-foreground shadow-[var(--shadow-lg)] backdrop:bg-black/70"
        ref={dialogRef}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <h2 id="manual-quote-title" className="text-base font-semibold">
            Manual quote · {ticker}
          </h2>
          <button
            aria-label="Close manual quote dialog"
            className="grid size-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <p className="px-4 pt-3 text-sm leading-relaxed text-muted-foreground">
          A newer manual quote becomes the current quote. Research history is
          never changed.
        </p>
        <form action={action} className="flex flex-col gap-4 p-4" ref={formRef}>
          <input name="stockId" type="hidden" value={stockId} />
          <input name="marketCode" type="hidden" value={marketCode} />
          <input name="ticker" type="hidden" value={ticker} />
          <input name="currency" type="hidden" value={currency} />
          <input name="asOf" type="hidden" value={localValueToIso(asOf)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
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
              className="rounded-[var(--radius-sm)] border border-destructive bg-[var(--negative-subtle)] p-3 text-sm text-destructive"
            >
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <ActionButton
              onClick={() => dialogRef.current?.close()}
              type="button"
              variant="ghost"
            >
              Cancel
            </ActionButton>
            <ActionButton disabled={pending} type="submit" variant="primary">
              {pending ? "Saving…" : "Save quote"}
            </ActionButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
