"use client";

import { Upload } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  importStooqCsvAction,
  type ImportStooqCsvActionState,
} from "@/app/(app)/market-data-actions";
import { controlClass } from "@/components/ui/terminal";
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
    <form
      action={action}
      className="grid grid-cols-[minmax(220px,0.8fr)_minmax(320px,1.2fr)_auto] items-end gap-3 p-3"
      ref={formRef}
    >
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
            "cursor-pointer p-0 pr-2 font-mono text-[10px] file:mr-3 file:h-8 file:border-0 file:border-r file:border-[var(--border-default)] file:bg-[var(--surface-elevated)] file:px-3 file:text-[10px] file:font-semibold file:text-[var(--text-primary)] hover:file:bg-[var(--surface-hover)]",
          )}
          disabled={disabled}
          name="file"
          required
          type="file"
        />
      </label>

      <button
        className="flex h-8 items-center justify-center gap-2 rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        type="submit"
      >
        <Upload aria-hidden="true" className="size-[14px]" />
        {pending ? "Importing…" : "Import CSV"}
      </button>

      {state.status !== "idle" && state.message ? (
        <p
          aria-live="polite"
          className={cn(
            "col-span-3 text-[10px]",
            state.status === "error"
              ? "text-[var(--negative)]"
              : "text-[var(--positive)]",
          )}
          role="status"
        >
          {state.message}
        </p>
      ) : targets.length === 0 ? (
        <p className="col-span-3 text-[10px] text-[var(--warning)]">
          Add or restore a GPW stock before importing a Stooq file.
        </p>
      ) : null}
    </form>
  );
}
