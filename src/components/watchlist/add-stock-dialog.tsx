"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  addProviderStockAction,
  addStockAction,
} from "@/app/(app)/watchlist/actions";
import type { AddStockActionState } from "@/application/watchlist/action-state";
import type {
  MarketDefinition,
  StatusDefinition,
} from "@/application/watchlist/types";
import { ActionButton, Field, controlClass } from "@/components/ui/terminal";
import { useT } from "@/i18n/provider";
import { resolveStatusLabel } from "@/i18n/status";

const initialAddState: AddStockActionState = { status: "idle" };

export function AddStockDialog({
  markets,
  statuses,
  providerConfigured,
  compactTrigger = false,
}: {
  markets: MarketDefinition[];
  statuses: StatusDefinition[];
  providerConfigured: boolean;
  compactTrigger?: boolean;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const manualFormRef = useRef<HTMLFormElement>(null);
  const activeStatuses = statuses.filter((status) => status.isActive);
  const [initialStatusId, setInitialStatusId] = useState(
    activeStatuses[0]?.id ?? "",
  );
  const [providerState, providerAction, providerPending] = useActionState(
    addProviderStockAction,
    initialAddState,
  );
  const [manualState, manualAction, manualPending] = useActionState(
    addStockAction,
    initialAddState,
  );
  const providerWasPendingRef = useRef(false);
  const manualWasPendingRef = useRef(false);

  useEffect(() => {
    if (providerPending) {
      providerWasPendingRef.current = true;
      return;
    }
    if (!providerWasPendingRef.current) return;
    providerWasPendingRef.current = false;
    if (providerState.status !== "success") return;

    toast.success(t("watchlist.stockAdded"), {
      description:
        providerState.message ?? t("watchlist.stockAddedDescription"),
      duration: 3500,
    });
    manualFormRef.current?.reset();
    dialogRef.current?.close();
  }, [providerPending, providerState.message, providerState.status, t]);

  useEffect(() => {
    if (manualPending) {
      manualWasPendingRef.current = true;
      return;
    }
    if (!manualWasPendingRef.current) return;
    manualWasPendingRef.current = false;
    if (manualState.status !== "success") return;

    toast.success(t("watchlist.stockAdded"), {
      description:
        manualState.message ?? t("watchlist.stockAddedDescription"),
      duration: 3500,
    });
    manualFormRef.current?.reset();
    dialogRef.current?.close();
  }, [manualPending, manualState.message, manualState.status, t]);

  const fieldError = (
    field: keyof NonNullable<typeof manualState.fieldErrors>,
  ) => manualState.fieldErrors?.[field]?.[0];

  return (
    <>
      {compactTrigger ? (
        <button
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
          onClick={() => dialogRef.current?.showModal()}
          type="button"
        >
          {t("watchlist.addStockTrigger")}
        </button>
      ) : (
        <ActionButton
          className="w-full sm:w-auto"
          onClick={() => dialogRef.current?.showModal()}
          type="button"
          variant="primary"
        >
          <Plus aria-hidden="true" className="size-4" />
          <span>{t("watchlist.addStock")}</span>
        </ActionButton>
      )}

      <dialog
        aria-labelledby="add-stock-title"
        className="m-auto max-h-[min(760px,90vh)] w-[min(100%,32.5rem)] overflow-y-auto rounded-[var(--radius-dialog)] border border-border bg-popover p-0 text-popover-foreground shadow-[var(--shadow-lg)] backdrop:bg-black/65"
        ref={dialogRef}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-popover px-4 py-4">
          <div>
            <h2 id="add-stock-title" className="text-base font-semibold">
              {t("watchlist.addStockTitle")}
            </h2>
            <p className="pt-1 text-sm text-muted-foreground">
              {t("watchlist.addStockDescription")}
            </p>
          </div>
          <button
            aria-label={t("watchlist.closeAddStock")}
            className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <Field label={t("watchlist.initialStatus")}>
            <select
              className={controlClass}
              disabled={activeStatuses.length === 0}
              onChange={(event) => setInitialStatusId(event.target.value)}
              value={initialStatusId}
            >
              {activeStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {resolveStatusLabel(status, t)}
                </option>
              ))}
            </select>
          </Field>

          <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-card p-3">
            <div>
              <h3 className="text-sm font-semibold">
                {t("watchlist.usaAutomatic")}
              </h3>
              <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                {t("watchlist.usaAutomaticDescription")}
              </p>
            </div>
            <form
              action={providerAction}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
            >
              <input name="marketCode" type="hidden" value="USA" />
              <input
                name="initialStatusId"
                type="hidden"
                value={initialStatusId}
              />
              <input
                autoCapitalize="characters"
                autoComplete="off"
                className={controlClass}
                disabled={!providerConfigured}
                maxLength={16}
                name="providerSymbol"
                placeholder={t("watchlist.tickerExamplePlaceholder")}
                required
              />
              <ActionButton
                className="disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  !providerConfigured || providerPending || !initialStatusId
                }
                type="submit"
                variant="primary"
              >
                {providerPending
                  ? t("watchlist.adding")
                  : t("watchlist.addUsaStock")}
              </ActionButton>
            </form>

            {!providerConfigured ? (
              <p className="rounded-[var(--radius-sm)] border border-warning bg-[var(--warning-subtle)] p-2 text-[0.8125rem] text-warning">
                {t("watchlist.massiveNotConfigured")}
              </p>
            ) : null}
            {providerState.status === "error" && providerState.message ? (
              <p
                aria-live="polite"
                className="rounded-[var(--radius-sm)] border border-negative bg-[var(--negative-subtle)] p-2 text-[0.8125rem] text-negative"
              >
                {providerState.message}
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-3 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-semibold">
                {t("watchlist.manualFallback")}
              </h3>
              <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                {t("watchlist.manualFallbackDescription")}
              </p>
            </div>
            <form
              action={manualAction}
              className="flex flex-col gap-3"
              ref={manualFormRef}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[7.5rem_1fr]">
                <Field label={t("common.market")}>
                  <select className={controlClass} name="marketCode" required>
                    {markets.map((market) => (
                      <option key={market.code} value={market.code}>
                        {market.code} · {market.currency}
                      </option>
                    ))}
                  </select>
                  {fieldError("marketCode") ? (
                    <span className="text-[0.8125rem] text-negative">
                      {fieldError("marketCode")}
                    </span>
                  ) : null}
                </Field>
                <Field label={t("common.ticker")}>
                  <input
                    autoCapitalize="characters"
                    className={controlClass}
                    maxLength={24}
                    name="ticker"
                    placeholder={t("watchlist.tickerManualPlaceholder")}
                    required
                  />
                  {fieldError("ticker") ? (
                    <span className="text-[0.8125rem] text-negative">
                      {fieldError("ticker")}
                    </span>
                  ) : null}
                </Field>
              </div>
              <Field label={t("watchlist.companyName")}>
                <input
                  className={controlClass}
                  maxLength={160}
                  name="name"
                  placeholder={t("watchlist.companyNamePlaceholder")}
                  required
                />
                {fieldError("name") ? (
                  <span className="text-[0.8125rem] text-negative">
                    {fieldError("name")}
                  </span>
                ) : null}
              </Field>
              <input
                name="initialStatusId"
                type="hidden"
                value={initialStatusId}
              />
              {manualState.status === "error" && manualState.message ? (
                <p
                  aria-live="polite"
                  className="rounded-[var(--radius-sm)] border border-negative bg-[var(--negative-subtle)] p-2 text-sm text-negative"
                >
                  {manualState.message}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <ActionButton
                  onClick={() => dialogRef.current?.close()}
                  type="button"
                  variant="ghost"
                >
                  {t("common.cancel")}
                </ActionButton>
                <ActionButton
                  className="disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={manualPending || !initialStatusId}
                  type="submit"
                  variant="primary"
                >
                  {manualPending
                    ? t("watchlist.adding")
                    : t("watchlist.addManually")}
                </ActionButton>
              </div>
            </form>
          </section>
        </div>
      </dialog>
    </>
  );
}
