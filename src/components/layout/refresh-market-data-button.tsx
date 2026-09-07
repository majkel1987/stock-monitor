"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";

import {
  refreshMarketDataAction,
  type RefreshMarketDataActionState,
} from "@/app/(app)/market-data-actions";
import { cn } from "@/lib/utils/cn";

const initialState: RefreshMarketDataActionState = { status: "idle" };

export function RefreshMarketDataButton({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState(
    refreshMarketDataAction,
    initialState,
  );

  return (
    <form action={action} className="relative">
      <button
        aria-label={label ?? "Refresh market data"}
        className={cn(
          label
            ? "flex h-8 items-center justify-center gap-2 rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]"
            : "grid size-8 place-items-center rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
          "disabled:cursor-wait disabled:opacity-50",
          className,
        )}
        disabled={pending}
        title={state.message ?? "Refresh EODHD quotes and the NBP USD/PLN rate"}
        type="submit"
      >
        <RefreshCw
          aria-hidden="true"
          className={cn("size-[14px]", pending && "animate-spin")}
        />
        {label ? (pending ? "Synchronizing…" : label) : null}
      </button>
      {state.status !== "idle" && state.message ? (
        <span
          aria-live="polite"
          className={cn(
            "absolute top-10 right-0 z-50 w-72 rounded-[5px] border bg-[var(--surface-elevated)] p-2 text-[10px] shadow-xl",
            state.status === "error"
              ? "border-[var(--negative)] text-[var(--negative)]"
              : state.status === "partial" || state.status === "cooldown"
                ? "border-[var(--warning)] text-[var(--warning)]"
                : "border-[var(--positive)] text-[var(--positive)]",
          )}
          role="status"
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
