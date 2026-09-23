"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createPortfolioTransactionAction,
  idlePortfolioActionState,
  updatePortfolioTransactionAction,
} from "@/app/(app)/portfolio/actions";
import type {
  PortfolioStock,
  PortfolioTransaction,
} from "@/application/portfolio/types";
import { ActionButton, controlClass, Field } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

function parseInput(value: string) {
  const normalized = value
    .trim()
    .replace(/[\s\u00a0]/g, "")
    .replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function InvestmentDialog({
  stocks,
  defaultStockId,
  transaction,
  defaultDate,
  compactTrigger = false,
  triggerClassName,
}: {
  stocks: PortfolioStock[];
  defaultStockId?: string;
  transaction?: PortfolioTransaction;
  defaultDate: string;
  compactTrigger?: boolean;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const editing = Boolean(transaction);
  const action = editing
    ? updatePortfolioTransactionAction
    : createPortfolioTransactionAction;
  const [state, formAction, pending] = useActionState(
    action,
    idlePortfolioActionState,
  );
  const initialStockId =
    transaction?.stockId ?? defaultStockId ?? stocks[0]?.id ?? "";
  const [stockId, setStockId] = useState(initialStockId);
  const [quantity, setQuantity] = useState(transaction?.quantity ?? "");
  const [price, setPrice] = useState(transaction?.pricePerShare ?? "");
  const wasPending = useRef(false);
  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.id === stockId) ?? null,
    [stockId, stocks],
  );
  const estimatedValue = useMemo(() => {
    const parsedQuantity = parseInput(quantity);
    const parsedPrice = parseInput(price);
    if (parsedQuantity === null || parsedPrice === null) return null;
    if (parsedQuantity <= 0 || parsedPrice <= 0) return null;
    return parsedQuantity * parsedPrice;
  }, [price, quantity]);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    if (state.status !== "success") return;
    toast.success(editing ? "Investment updated" : "Investment added", {
      description: state.message,
    });
    dialogRef.current?.close();
    if (!editing) {
      formRef.current?.reset();
    }
  }, [editing, pending, state.message, state.status]);

  const fieldError = (field: string) => state.fieldErrors?.[field]?.[0];
  const stockLocked =
    editing || (stocks.length === 1 && Boolean(defaultStockId));
  const openDialog = () => {
    if (!editing) {
      setQuantity("");
      setPrice("");
    }
    dialogRef.current?.showModal();
  };

  return (
    <>
      {editing ? (
        <button
          aria-label="Edit investment"
          className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-primary hover:bg-secondary"
          onClick={openDialog}
          type="button"
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
      ) : compactTrigger ? (
        <button
          className={
            triggerClassName ??
            "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          }
          disabled={stocks.length === 0}
          onClick={openDialog}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" /> Add investment
        </button>
      ) : (
        <ActionButton
          disabled={stocks.length === 0}
          onClick={openDialog}
          variant="primary"
        >
          <Plus aria-hidden="true" className="size-4" /> Add investment
        </ActionButton>
      )}

      <dialog
        aria-labelledby={`investment-title-${transaction?.id ?? "new"}`}
        className="m-auto w-[min(100%-1.5rem,32rem)] rounded-[var(--radius-dialog)] border border-border bg-popover p-0 text-popover-foreground shadow-[var(--shadow-lg)] backdrop:bg-black/65 open:flex open:flex-col"
        ref={dialogRef}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-muted/40 p-4">
          <div>
            <p className="ui-eyebrow mb-1">
              {editing ? "Edit lot" : "New lot"}
            </p>
            <h2
              className="text-card-title"
              id={`investment-title-${transaction?.id ?? "new"}`}
            >
              {editing ? "Edit investment" : "Add investment"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Record a BUY lot. Transaction value is calculated automatically.
            </p>
          </div>
          <button
            aria-label="Close investment form"
            className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <form
          action={formAction}
          className="flex flex-col gap-4 p-4"
          ref={formRef}
        >
          {transaction ? (
            <input name="transactionId" type="hidden" value={transaction.id} />
          ) : null}
          {stockLocked ? (
            <input name="stockId" type="hidden" value={stockId} />
          ) : null}
          <Field label="Company">
            <select
              className={controlClass}
              disabled={stockLocked}
              name={stockLocked ? undefined : "stockId"}
              onChange={(event) => setStockId(event.target.value)}
              required
              value={stockId}
            >
              {stocks.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.ticker} · {stock.name} · {stock.marketCode}
                </option>
              ))}
            </select>
            {fieldError("stockId") ? (
              <span className="text-sm text-negative">
                {fieldError("stockId")}
              </span>
            ) : null}
          </Field>

          <Field label="Purchase date">
            <input
              className={controlClass}
              defaultValue={transaction?.transactionDate ?? defaultDate}
              name="transactionDate"
              required
              type="date"
            />
            {fieldError("transactionDate") ? (
              <span className="text-sm text-negative">
                {fieldError("transactionDate")}
              </span>
            ) : null}
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Quantity">
              <input
                className={controlClass}
                inputMode="decimal"
                name="quantity"
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="10 or 1,5"
                required
                value={quantity}
              />
              {fieldError("quantity") ? (
                <span className="text-sm text-negative">
                  {fieldError("quantity")}
                </span>
              ) : null}
            </Field>
            <Field
              label={`Price per share · ${selectedStock?.currency ?? "—"}`}
            >
              <input
                className={controlClass}
                inputMode="decimal"
                name="pricePerShare"
                onChange={(event) => setPrice(event.target.value)}
                placeholder="24.50 or 24,50"
                required
                value={price}
              />
              {fieldError("pricePerShare") ? (
                <span className="text-sm text-negative">
                  {fieldError("pricePerShare")}
                </span>
              ) : null}
            </Field>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border border-l-[3px] border-l-primary bg-muted p-3">
            <span className="ui-meta block font-semibold tracking-wide uppercase">
              Estimated transaction value
            </span>
            <strong className="mt-1 block font-mono text-base">
              {estimatedValue === null || !selectedStock
                ? "Enter price and quantity"
                : `${price} ${selectedStock.currency} × ${quantity} = ${new Intl.NumberFormat("en-US", { style: "currency", currency: selectedStock.currency }).format(estimatedValue)}`}
            </strong>
          </div>

          {state.status === "error" && state.message ? (
            <p
              aria-live="polite"
              className={cn(
                "rounded-[var(--radius-sm)] border border-negative bg-[var(--negative-subtle)] p-3 text-sm text-negative",
              )}
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <ActionButton
              onClick={() => dialogRef.current?.close()}
              variant="ghost"
            >
              Cancel
            </ActionButton>
            <ActionButton
              disabled={pending || !stockId}
              type="submit"
              variant="primary"
            >
              {pending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add investment"}
            </ActionButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
