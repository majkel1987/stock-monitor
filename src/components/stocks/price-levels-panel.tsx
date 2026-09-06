"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useActionState, useState } from "react";

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
import { controlClass, Field, textareaClass } from "@/components/ui/terminal";

function Message({ state }: { state: ResearchActionState }) {
  if (!state.message) return null;
  return (
    <p
      className={
        state.status === "error"
          ? "text-[10px] text-[var(--negative)]"
          : "text-[10px] text-[var(--positive)]"
      }
      role={state.status === "error" ? "alert" : "status"}
    >
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
    deactivatePriceLevelAction,
    idleResearchActionState,
  );
  return (
    <form action={action}>
      <input name="stockId" type="hidden" value={stockId} />
      <input name="levelId" type="hidden" value={levelId} />
      <button
        className="text-[9px] font-semibold text-[var(--negative)] disabled:opacity-50"
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
      if (result.status === "success") onDone();
      return result;
    },
    idleResearchActionState,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="stockId" type="hidden" value={stockId} />
      {level ? <input name="levelId" type="hidden" value={level.id} /> : null}
      <div className="grid grid-cols-2 gap-3">
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
        <button
          className="h-8 rounded-[5px] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          onClick={onDone}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-8 rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : level ? "Save level" : "Add level"}
        </button>
      </div>
    </form>
  );
}

export function PriceLevelsEditor({
  stockId,
  currency,
  levels,
}: {
  stockId: string;
  currency: "PLN" | "USD";
  levels: PriceLevelView[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PriceLevelView | null | undefined>(
    undefined,
  );

  const close = () => {
    setEditing(undefined);
    setOpen(false);
  };

  return (
    <>
      <button
        className="flex h-8 items-center justify-center rounded-[5px] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        Edit levels
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/55" role="presentation">
          <dialog
            aria-label="Edit price levels"
            className="fixed top-[52px] right-0 m-0 flex h-[calc(100vh-52px)] w-[460px] max-w-full flex-col border-l border-[var(--border-default)] bg-[var(--surface-elevated)] p-4 text-[var(--text-primary)] shadow-2xl"
            open
          >
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold">Edit price levels</h2>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  Active levels · currency fixed to {currency}
                </p>
              </div>
              <button aria-label="Close" onClick={close} type="button">
                <X className="size-4 text-[var(--text-muted)]" />
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
                <button
                  className="mb-3 flex h-8 items-center justify-center gap-1 rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)]"
                  onClick={() => setEditing(null)}
                  type="button"
                >
                  <Plus className="size-3.5" /> Add level
                </button>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[7px] border border-[var(--border-default)]">
                  {levels.length ? (
                    levels.map((level) => (
                      <div
                        className="flex items-center justify-between border-b border-[var(--border-subtle)] p-3"
                        key={level.id}
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-[11px]">
                            {level.label}
                          </strong>
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">
                            {Number(level.value).toLocaleString("en-US", {
                              maximumFractionDigits: 6,
                            })}{" "}
                            {level.currency} ·{" "}
                            {level.triggerDirection.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            aria-label={`Edit ${level.label}`}
                            className="text-[var(--accent-primary)]"
                            onClick={() => setEditing(level)}
                            type="button"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <DeactivateLevelButton
                            levelId={level.id}
                            stockId={stockId}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-[11px] text-[var(--text-muted)]">
                      No price levels
                    </p>
                  )}
                </div>
              </>
            )}
          </dialog>
        </div>
      ) : null}
    </>
  );
}
