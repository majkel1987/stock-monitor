"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { useActionState, useState } from "react";

import {
  commitImportReviewAction,
  type ImportReviewActionState,
} from "@/app/(app)/monitoring/imports/[batchId]/actions";
import type {
  ImportBatchSummary,
  ImportReviewItem,
} from "@/application/imports/types";
import { ActionButton, StatusBadge, Surface } from "@/components/ui/terminal";

function number(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "—" : `${value}${suffix}`;
}

function stateTone(state: ImportReviewItem["state"]) {
  if (state === "READY" || state === "COMMITTED") return "positive" as const;
  if (state === "WARNING") return "warning" as const;
  if (state === "ERROR") return "negative" as const;
  return "info" as const;
}

const initialImportReviewActionState: ImportReviewActionState = {
  status: "idle",
  message: "",
};

export function ImportReviewForm({ batch }: { batch: ImportBatchSummary }) {
  const [state, action, pending] = useActionState(
    commitImportReviewAction,
    initialImportReviewActionState,
  );
  const [selectedId, setSelectedId] = useState(batch.items[0]?.id ?? null);
  const [includedItemIds, setIncludedItemIds] = useState(
    () =>
      new Set(
        batch.items
          .filter((item) => item.includeInCommit)
          .map((item) => item.id),
      ),
  );
  const [acceptedWarningIds, setAcceptedWarningIds] = useState(
    () =>
      new Set(
        batch.items
          .filter((item) => item.warningsAccepted)
          .map((item) => item.id),
      ),
  );
  const [trancheActions, setTrancheActions] = useState<
    Record<string, "KEEP" | "ADD" | "SUPERSEDE">
  >(() =>
    Object.fromEntries(
      batch.items.flatMap((item) =>
        (item.company?.positionPlan.tranches ?? []).map((tranche) => [
          `${item.id}:${tranche.number}`,
          "KEEP" as const,
        ]),
      ),
    ),
  );
  const selected = batch.items.find((item) => item.id === selectedId) ?? null;
  const metrics = {
    ready: batch.items.filter((item) => item.state === "READY").length,
    warnings: batch.items.filter((item) => item.state === "WARNING").length,
    errors: batch.items.filter((item) => item.state === "ERROR").length,
    selected: includedItemIds.size,
  };

  function toggleIncluded(itemId: string, included: boolean) {
    setIncludedItemIds((current) => {
      const next = new Set(current);
      if (included) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  function toggleWarningAcceptance(itemId: string, accepted: boolean) {
    setAcceptedWarningIds((current) => {
      const next = new Set(current);
      if (accepted) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  }

  return (
    <form action={action} className="flex flex-1 flex-col gap-[14px]">
      <input name="batchId" type="hidden" value={batch.id} />
      {[...includedItemIds].map((itemId) => (
        <input key={itemId} name="includeItem" type="hidden" value={itemId} />
      ))}
      {[...acceptedWarningIds].map((itemId) => (
        <input key={itemId} name="acceptWarning" type="hidden" value={itemId} />
      ))}
      {Object.entries(trancheActions).map(([key, value]) => (
        <input
          key={key}
          name={`trancheAction:${key}`}
          type="hidden"
          value={value}
        />
      ))}
      <div className="grid grid-cols-5 gap-[10px]">
        {[
          ["COMPANIES", batch.items.length, "in batch"],
          ["READY", metrics.ready, "can commit"],
          ["WARNINGS", metrics.warnings, "needs acceptance"],
          ["ERRORS", metrics.errors, "excluded"],
          ["SELECTED", metrics.selected, `of ${batch.items.length}`],
        ].map(([label, value, detail]) => (
          <Surface
            className="flex h-[60px] flex-col gap-1 px-3 py-[9px]"
            key={label}
          >
            <span className="text-[8px] font-bold tracking-[0.5px] text-[var(--text-muted)]">
              {label}
            </span>
            <span className="flex items-baseline gap-2">
              <strong className="font-mono text-[17px]">{value}</strong>
              <span className="text-[9px] text-[var(--text-muted)]">
                {detail}
              </span>
            </span>
          </Surface>
        ))}
      </div>

      <Surface>
        <div className="grid h-[34px] grid-cols-[34px_58px_140px_90px_138px_54px_74px_74px_76px_70px_66px_1fr] items-center border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-[7px] text-[8px] font-semibold text-[var(--text-muted)]">
          {[
            "",
            "TICKER",
            "COMPANY",
            "DECISION",
            "STATUS",
            "SCORE",
            "PRICE",
            "CURRENT",
            "FAIR VALUE",
            "BASE %",
            "ASYM.",
            "IMPORT STATE",
          ].map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        {batch.items.map((item) => {
          const company = item.company;
          const disabled = !["READY", "WARNING"].includes(item.state);
          return (
            <div
              className={`grid h-[50px] w-full grid-cols-[34px_58px_140px_90px_138px_54px_74px_74px_76px_70px_66px_1fr] items-center border-b border-[var(--border-subtle)] px-[7px] text-left font-mono text-[9px] hover:bg-[var(--surface-hover)] ${selectedId === item.id ? "bg-[var(--surface-selected)]" : ""}`}
              data-import-item-id={item.id}
              data-import-item-state={item.state}
              key={item.id}
              onClick={() => setSelectedId(item.id)}
            >
              <input
                aria-label={`Include ${item.ticker ?? item.externalId}`}
                checked={includedItemIds.has(item.id)}
                disabled={disabled}
                onChange={(event) =>
                  toggleIncluded(item.id, event.currentTarget.checked)
                }
                onClick={(event) => event.stopPropagation()}
                type="checkbox"
              />
              <strong>{item.ticker ?? "—"}</strong>
              <span className="truncate pr-2">
                {item.companyName ?? "Invalid company"}
              </span>
              <span>{item.decisionAction?.replaceAll("_", " ") ?? "—"}</span>
              <span className="truncate text-[var(--accent-primary)]">
                {item.importedStatusSlug?.replaceAll("_", " ") ?? "—"}
              </span>
              <strong>{company?.score.total ?? "—"}</strong>
              <span>{number(company?.marketData.price)}</span>
              <span>{number(item.currentPrice)}</span>
              <span>{number(company?.valuation.fairValueBase)}</span>
              <span>
                {number(company?.expectedReturn.baseTotalReturnPct, "%")}
              </span>
              <span>{number(company?.expectedReturn.asymmetryRatio, "×")}</span>
              <StatusBadge tone={stateTone(item.state)}>
                {item.state}
              </StatusBadge>
            </div>
          );
        })}
      </Surface>

      <div className="grid min-h-[220px] flex-1 grid-cols-[1fr_430px] gap-[14px]">
        <Surface>
          <header className="flex h-[38px] items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3">
            <span className="flex items-center gap-2 text-[11px] font-semibold">
              <AlertTriangle className="size-3.5 text-[var(--warning)]" />
              {selected?.ticker ?? "Item"} · warnings and validation
            </span>
          </header>
          <div className="space-y-2 p-3">
            {selected?.warnings.map((warning) => (
              <label
                className="flex gap-2 rounded-[5px] border-l-[3px] border-[var(--warning)] bg-[var(--warning-subtle)] p-[10px] text-[10px]"
                key={warning}
              >
                <input
                  checked={acceptedWarningIds.has(selected.id)}
                  onChange={(event) =>
                    toggleWarningAcceptance(
                      selected.id,
                      event.currentTarget.checked,
                    )
                  }
                  type="checkbox"
                />
                <span>{warning}</span>
              </label>
            ))}
            {selected?.errors.map((error) => (
              <div
                className="rounded-[5px] border-l-[3px] border-[var(--negative)] bg-[var(--negative-subtle)] p-[10px] text-[10px]"
                key={`${error.path}-${error.message}`}
              >
                <span className="font-mono text-[var(--negative)]">
                  {error.path}
                </span>
                <p className="mt-1 text-[var(--text-secondary)]">
                  {error.message}
                </p>
              </div>
            ))}
            {selected &&
            selected.warnings.length === 0 &&
            selected.errors.length === 0 ? (
              <p className="text-[10px] text-[var(--positive)]">
                No warnings. This item is ready to commit.
              </p>
            ) : null}
          </div>
        </Surface>

        <Surface>
          <header className="flex h-[38px] items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3">
            <span className="text-[10px] font-bold">
              PRICE LEVEL RESOLUTION
            </span>
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              {selected?.company?.positionPlan.tranches.length ?? 0} imported
            </span>
          </header>
          <div className="space-y-[9px] p-3">
            {selected?.company?.positionPlan.tranches.map((tranche) => (
              <div
                className="flex h-10 items-center justify-between rounded-[5px] border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-[10px]"
                key={tranche.number}
              >
                <div>
                  <p className="text-[8px] font-bold text-[var(--text-muted)]">
                    TRANCHE {tranche.number}
                  </p>
                  <p className="font-mono text-[10px] font-semibold">
                    {tranche.triggerPrice === null
                      ? "Event condition only"
                      : `${tranche.triggerPrice} ${tranche.currency}`}
                  </p>
                </div>
                <label className="relative">
                  <select
                    className="h-7 appearance-none rounded-[4px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-2 pr-7 text-[9px] font-bold"
                    disabled={tranche.triggerPrice === null}
                    onChange={(event) =>
                      setTrancheActions((current) => ({
                        ...current,
                        [`${selected.id}:${tranche.number}`]: event
                          .currentTarget.value as "KEEP" | "ADD" | "SUPERSEDE",
                      }))
                    }
                    value={
                      trancheActions[`${selected.id}:${tranche.number}`] ??
                      "KEEP"
                    }
                  >
                    <option value="KEEP">KEEP</option>
                    <option value="ADD">ADD</option>
                    <option value="SUPERSEDE">SUPERSEDE</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-2 right-2 size-3 text-[var(--text-muted)]" />
                </label>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      {state.status === "error" ? (
        <p className="text-[11px] text-[var(--negative)]" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <ActionButton disabled={pending} type="submit" variant="primary">
          {pending ? "Committing…" : "Commit selected items"}
        </ActionButton>
      </div>
    </form>
  );
}
