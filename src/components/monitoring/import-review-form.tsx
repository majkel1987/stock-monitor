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
import {
  ActionButton,
  MetricCard,
  SectionHeader,
  StatusBadge,
  Surface,
  controlClass,
} from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

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
    <form action={action} className="flex flex-1 flex-col gap-4">
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          hint="in batch"
          label="Companies"
          value={batch.items.length}
        />
        <MetricCard
          hint="can commit"
          label="Ready"
          tone="positive"
          value={metrics.ready}
        />
        <MetricCard
          hint="needs acceptance"
          label="Warnings"
          tone={metrics.warnings > 0 ? "warning" : "default"}
          value={metrics.warnings}
        />
        <MetricCard
          hint="excluded"
          label="Errors"
          tone={metrics.errors > 0 ? "negative" : "default"}
          value={metrics.errors}
        />
        <MetricCard
          hint={`of ${batch.items.length}`}
          label="Selected"
          value={metrics.selected}
        />
      </div>

      <Surface>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[72rem]">
            <thead>
              <tr>
                <th className="w-10" scope="col">
                  <span className="sr-only">Include</span>
                </th>
                <th scope="col">Ticker</th>
                <th scope="col">Company</th>
                <th scope="col">Decision</th>
                <th scope="col">Status</th>
                <th className="text-right" scope="col">
                  Score
                </th>
                <th className="text-right" scope="col">
                  Price
                </th>
                <th className="text-right" scope="col">
                  Current
                </th>
                <th className="text-right" scope="col">
                  Fair value
                </th>
                <th className="text-right" scope="col">
                  Base %
                </th>
                <th className="text-right" scope="col">
                  Asym.
                </th>
                <th scope="col">Import state</th>
              </tr>
            </thead>
            <tbody>
              {batch.items.map((item) => {
                const company = item.company;
                const disabled = !["READY", "WARNING"].includes(item.state);
                return (
                  <tr
                    className={cn(
                      "cursor-pointer",
                      selectedId === item.id && "bg-[var(--accent-subtle)]",
                    )}
                    data-import-item-id={item.id}
                    data-import-item-state={item.state}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td>
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
                    </td>
                    <td className="font-mono font-semibold">
                      {item.ticker ?? "—"}
                    </td>
                    <td className="max-w-[12rem] truncate">
                      {item.companyName ?? "Invalid company"}
                    </td>
                    <td>
                      {item.decisionAction?.replaceAll("_", " ") ?? "—"}
                    </td>
                    <td className="truncate text-primary">
                      {item.importedStatusSlug?.replaceAll("_", " ") ?? "—"}
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {company?.score.total ?? "—"}
                    </td>
                    <td className="text-right font-mono">
                      {number(company?.marketData.price)}
                    </td>
                    <td className="text-right font-mono">
                      {number(item.currentPrice)}
                    </td>
                    <td className="text-right font-mono">
                      {number(company?.valuation.fairValueBase)}
                    </td>
                    <td className="text-right font-mono">
                      {number(
                        company?.expectedReturn.baseTotalReturnPct,
                        "%",
                      )}
                    </td>
                    <td className="text-right font-mono">
                      {number(company?.expectedReturn.asymmetryRatio, "×")}
                    </td>
                    <td>
                      <StatusBadge tone={stateTone(item.state)}>
                        {item.state}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]">
        <Surface>
          <SectionHeader
            meta={
              <AlertTriangle
                aria-hidden="true"
                className="size-3.5 text-warning"
              />
            }
            title={`${selected?.ticker ?? "Item"} · warnings and validation`}
          />
          <div className="space-y-2 p-4">
            {selected?.warnings.map((warning) => (
              <label
                className="flex gap-2 rounded-[var(--radius-md)] border border-warning/40 border-l-[3px] border-l-warning bg-[var(--warning-subtle)] p-3 text-sm"
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
                className="rounded-[var(--radius-md)] border border-negative/40 border-l-[3px] border-l-negative bg-[var(--negative-subtle)] p-3 text-sm"
                key={`${error.path}-${error.message}`}
              >
                <span className="font-mono text-negative">{error.path}</span>
                <p className="mt-1 text-secondary-foreground">{error.message}</p>
              </div>
            ))}
            {selected &&
            selected.warnings.length === 0 &&
            selected.errors.length === 0 ? (
              <p className="text-sm text-positive">
                No warnings. This item is ready to commit.
              </p>
            ) : null}
          </div>
        </Surface>

        <Surface>
          <SectionHeader
            meta={`${selected?.company?.positionPlan.tranches.length ?? 0} imported`}
            title="Price level resolution"
          />
          <div className="space-y-2 p-4">
            {selected?.company?.positionPlan.tranches.map((tranche) => (
              <div
                className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-muted px-3 py-2"
                key={tranche.number}
              >
                <div>
                  <p className="ui-meta font-semibold tracking-wide uppercase">
                    Tranche {tranche.number}
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {tranche.triggerPrice === null
                      ? "Event condition only"
                      : `${tranche.triggerPrice} ${tranche.currency}`}
                  </p>
                </div>
                <label className="relative shrink-0">
                  <select
                    className={cn(controlClass, "h-9 w-[8.5rem] appearance-none pr-8")}
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
                  <ChevronDown
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  />
                </label>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-negative" role="alert">
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
