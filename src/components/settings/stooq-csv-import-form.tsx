"use client";

import { Upload } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  importStooqCsvAction,
  type ImportStooqCsvActionState,
} from "@/app/(app)/market-data-actions";
import { ActionButton, controlClass } from "@/components/ui/terminal";
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

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  const disabled = pending || targets.length === 0;

  return (
    <>
      <ActionButton
        onClick={() => dialogRef.current?.showModal()}
        type="button"
        variant="secondary"
      >
        Import GPW CSV
      </ActionButton>

      <dialog
        aria-labelledby="stooq-csv-dialog-title"
        className="m-auto w-[360px] rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-0 text-[var(--text-primary)] backdrop:bg-black/60"
        ref={dialogRef}
      >
        <form
          action={action}
          className="flex flex-col gap-[14px] p-4"
          ref={formRef}
        >
          <div className="flex flex-col gap-1">
            <h2
              className="text-[15px] font-semibold"
              id="stooq-csv-dialog-title"
            >
              Import GPW prices
            </h2>
            <p className="text-xs leading-4 text-[var(--text-secondary)]">
              Select an active GPW stock and a Stooq CSV file with daily OHLCV
              data. Maximum file size is 5 MB.
            </p>
          </div>

          <label className="flex min-w-0 flex-col gap-[5px]">
            <span className="text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
              GPW stock
            </span>
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
          </label>

          <label className="flex min-w-0 flex-col gap-[5px]">
            <span className="text-[11px] leading-[14px] font-semibold text-[var(--text-secondary)]">
              Stooq CSV file
            </span>
            <input
              accept=".csv,text/csv"
              className={cn(
                controlClass,
                "cursor-pointer p-0 pr-2 font-mono text-[10px] file:mr-3 file:h-8 file:border-0 file:border-r file:border-[var(--border-default)] file:bg-[var(--surface-default)] file:px-3 file:text-[10px] file:font-semibold file:text-[var(--text-primary)] hover:file:bg-[var(--surface-hover)]",
              )}
              disabled={disabled}
              name="file"
              required
              type="file"
            />
          </label>

          {state.status !== "idle" && state.message ? (
            <p
              aria-live="polite"
              className={cn(
                "text-[10px]",
                state.status === "error"
                  ? "text-[var(--negative)]"
                  : "text-[var(--positive)]",
              )}
              role="status"
            >
              {state.message}
            </p>
          ) : targets.length === 0 ? (
            <p className="text-[10px] text-[var(--warning)]">
              Add or restore a GPW stock before importing a Stooq file.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <ActionButton
              disabled={pending}
              onClick={() => dialogRef.current?.close()}
              type="button"
              variant="ghost"
            >
              Cancel
            </ActionButton>
            <ActionButton disabled={disabled} type="submit" variant="primary">
              <Upload aria-hidden="true" className="mr-2 size-[14px]" />
              {pending ? "Importing…" : "Import CSV"}
            </ActionButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
