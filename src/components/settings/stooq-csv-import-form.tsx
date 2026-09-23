"use client";

import { Upload, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  importStooqCsvAction,
  type ImportStooqCsvActionState,
} from "@/app/(app)/market-data-actions";
import { ActionButton, Field, controlClass } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

const initialState: ImportStooqCsvActionState = { status: "idle" };

export type StooqCsvImportTarget = {
  stockId: string;
  ticker: string;
  name: string;
};

export function StooqCsvImportForm({
  targets,
}: {
  targets: StooqCsvImportTarget[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    importStooqCsvAction,
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

    formRef.current?.reset();
    toast.success("CSV imported", {
      description: state.message,
      duration: 3500,
    });
    dialogRef.current?.close();
  }, [pending, state.message, state.status]);

  const disabled = pending || targets.length === 0;

  return (
    <>
      <ActionButton
        className="w-full sm:w-auto"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
        variant="secondary"
      >
        Import GPW CSV
      </ActionButton>

      <dialog
        aria-labelledby="stooq-csv-dialog-title"
        className="m-auto max-h-[min(640px,90vh)] w-[min(100%,28rem)] overflow-y-auto rounded-[var(--radius-dialog)] border border-border bg-popover p-0 text-popover-foreground shadow-[var(--shadow-lg)] backdrop:bg-black/70"
        ref={dialogRef}
      >
        <form action={action} className="flex flex-col" ref={formRef}>
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-4">
            <div className="min-w-0">
              <h2
                className="text-base font-semibold"
                id="stooq-csv-dialog-title"
              >
                Import GPW prices
              </h2>
              <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
                Select an active GPW stock and a Stooq CSV file with daily
                OHLCV data. Maximum file size is 5 MB.
              </p>
            </div>
            <button
              aria-label="Close CSV import"
              className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-5 p-4 sm:p-5">
            <Field label="GPW stock">
              <select
                className={controlClass}
                disabled={disabled}
                name="stockId"
                required
              >
                {targets.length ? (
                  targets.map((target) => (
                    <option key={target.stockId} value={target.stockId}>
                      {target.ticker} · {target.name}
                    </option>
                  ))
                ) : (
                  <option value="">No active GPW stocks</option>
                )}
              </select>
            </Field>

            <Field label="Stooq CSV file">
              <input
                accept=".csv,text/csv"
                className={cn(
                  controlClass,
                  "cursor-pointer py-2 font-mono text-sm file:mr-3 file:h-11 file:border-0 file:border-r file:border-border file:bg-muted file:px-3 file:text-sm file:font-semibold file:text-foreground hover:file:bg-secondary",
                )}
                disabled={disabled}
                name="file"
                required
                type="file"
              />
            </Field>

            {state.status === "error" && state.message ? (
              <p
                aria-live="polite"
                className="rounded-[var(--radius-sm)] border border-negative bg-[var(--negative-subtle)] p-3 text-sm text-negative"
                role="alert"
              >
                {state.message}
              </p>
            ) : targets.length === 0 ? (
              <p className="text-sm text-warning">
                Add or restore a GPW stock before importing a Stooq file.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end sm:p-5">
            <ActionButton
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              type="button"
              variant="ghost"
            >
              Cancel
            </ActionButton>
            <ActionButton disabled={disabled} type="submit" variant="primary">
              <Upload aria-hidden="true" className="size-4" />
              {pending ? "Importing…" : "Import CSV"}
            </ActionButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
