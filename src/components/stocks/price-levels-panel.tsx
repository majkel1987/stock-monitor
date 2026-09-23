"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createPriceLevelAction,
  deactivatePriceLevelAction,
  updatePriceLevelAction,
} from "@/app/(app)/stocks/[market]/[ticker]/actions";
import {
  idleResearchActionState,
  type ResearchActionState,
} from "@/application/research/action-state";
import type { PriceLevelView } from "@/application/stocks/research-types";
import {
  ActionButton,
  controlClass,
  Field,
  textareaClass,
} from "@/components/ui/terminal";

function Message({ state }: { state: ResearchActionState }) {
  if (!state.message || state.status !== "error") return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {state.message}
    </p>
  );
}

function DeactivateLevelButton({
  stockId,
  levelId,
}: {
  stockId: string;
  levelId: string;
}) {
  const [state, action, pending] = useActionState(
    async (previous: ResearchActionState, formData: FormData) => {
      const result = await deactivatePriceLevelAction(previous, formData);
      if (result.status === "success") {
        toast.success("Price level deactivated", {
          description: result.message,
        });
      }
      return result;
    },
    idleResearchActionState,
  );
  return (
    <form action={action}>
      <input name="stockId" type="hidden" value={stockId} />
      <input name="levelId" type="hidden" value={levelId} />
      <button
        className="inline-flex min-h-11 items-center text-sm font-semibold text-destructive disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Disabling…" : "Deactivate"}
      </button>
      {state.status === "error" ? (
        <span className="sr-only">{state.message}</span>
      ) : null}
    </form>
  );
}

function PriceLevelForm({
  stockId,
  currency,
  level,
  onDone,
}: {
  stockId: string;
  currency: "PLN" | "USD";
  level: PriceLevelView | null;
  onDone(): void;
}) {
  const serverAction = level ? updatePriceLevelAction : createPriceLevelAction;
  const [state, action, pending] = useActionState(
    async (previousState: ResearchActionState, formData: FormData) => {
      const result = await serverAction(previousState, formData);
      if (result.status === "success") {
        toast.success(level ? "Price level updated" : "Price level added", {
          description: result.message,
        });
        onDone();
      }
      return result;
    },
    idleResearchActionState,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="stockId" type="hidden" value={stockId} />
      {level ? <input name="levelId" type="hidden" value={level.id} /> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Label">
          <input
            className={controlClass}
            defaultValue={level?.label ?? ""}
            maxLength={80}
            name="label"
            required
          />
        </Field>
        <Field label="Kind">
          <select
            className={controlClass}
            defaultValue={level?.kind ?? "buy"}
            name="kind"
          >
            <option value="buy">Buy</option>
            <option value="fair_value">Fair value</option>
            <option value="sell">Sell</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
        <Field label={`Value · ${currency}`}>
          <input
            className={controlClass}
            defaultValue={level?.value ?? ""}
            min="0.000001"
            name="value"
            required
            step="0.000001"
            type="number"
          />
        </Field>
        <Field label="Reached when">
          <select
            className={controlClass}
            defaultValue={level?.triggerDirection ?? "lte"}
            name="triggerDirection"
          >
            <option value="lte">Price ≤ level</option>
            <option value="gte">Price ≥ level</option>
          </select>
        </Field>
        <Field label="Priority">
          <input
            className={controlClass}
            defaultValue={level?.priority ?? ""}
            min="0"
            name="priority"
            step="1"
            type="number"
          />
        </Field>
        <Field label="Sort order">
          <input
            className={controlClass}
            defaultValue={level?.sortOrder ?? 0}
            min="0"
            name="sortOrder"
            required
            step="1"
            type="number"
          />
        </Field>
      </div>
      <input name="currency" type="hidden" value={currency} />
      <Field label="Note">
        <textarea
          className={textareaClass}
          defaultValue={level?.note ?? ""}
          maxLength={1_000}
          name="note"
        />
      </Field>
      <Message state={state} />
      <div className="flex justify-end gap-2">
        <ActionButton onClick={onDone} type="button" variant="ghost">
          Cancel
        </ActionButton>
        <ActionButton disabled={pending} type="submit" variant="primary">
          {pending ? "Saving…" : level ? "Save level" : "Add level"}
        </ActionButton>
      </div>
    </form>
  );
}

export function PriceLevelsEditor({
  stockId,
  currency,
  levels,
  triggerClassName,
}: {
  stockId: string;
  currency: "PLN" | "USD";
  levels: PriceLevelView[];
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<PriceLevelView | null | undefined>(
    undefined,
  );

  const close = () => {
    setEditing(undefined);
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        className={
          triggerClassName ??
          "ui-button ui-button-secondary w-full justify-center lg:w-auto"
        }
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        Edit levels
      </button>
      <dialog
        aria-label="Edit price levels"
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none flex-col border-0 bg-popover p-4 text-popover-foreground shadow-[var(--shadow-lg)] backdrop:bg-black/70 open:flex sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(100%,28.75rem)] sm:border-l sm:border-border"
        onClose={() => setEditing(undefined)}
        ref={dialogRef}
      >
        <header className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h2 className="text-base font-semibold">Edit price levels</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Active levels · currency fixed to {currency}
            </p>
          </div>
          <button
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary"
            onClick={close}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        {editing !== undefined ? (
          <PriceLevelForm
            currency={currency}
            key={editing?.id ?? "new"}
            level={editing}
            onDone={() => setEditing(undefined)}
            stockId={stockId}
          />
        ) : (
          <>
            <ActionButton
              className="mb-3 w-full"
              onClick={() => setEditing(null)}
              type="button"
              variant="primary"
            >
              <Plus aria-hidden="true" className="size-4" /> Add level
            </ActionButton>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[var(--radius-surface)] border border-border">
              {levels.length ? (
                levels.map((level) => (
                  <div
                    className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-3 last:border-b-0"
                    key={level.id}
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">
                        {level.label}
                      </strong>
                      <span className="font-mono text-[0.8125rem] text-muted-foreground">
                        {Number(level.value).toLocaleString("en-US", {
                          maximumFractionDigits: 6,
                        })}{" "}
                        {level.currency} ·{" "}
                        {level.triggerDirection.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label={`Edit ${level.label}`}
                        className="grid size-9 place-items-center rounded-[var(--radius-sm)] text-primary hover:bg-secondary"
                        onClick={() => setEditing(level)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </button>
                      <DeactivateLevelButton
                        levelId={level.id}
                        stockId={stockId}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  No price levels configured.
                </p>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
