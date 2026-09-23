"use client";

import { RefreshCw } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  refreshMarketDataAction,
  type RefreshMarketDataActionState,
} from "@/app/(app)/market-data-actions";
import { useTranslate } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";

const initialState: RefreshMarketDataActionState = { status: "idle" };

export function RefreshMarketDataButton({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { t } = useTranslate();
  const [state, action, pending] = useActionState(
    refreshMarketDataAction,
    initialState,
  );
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    const titleForStatus = (
      status: Exclude<RefreshMarketDataActionState["status"], "idle">,
      message: string,
    ): string => {
      if (status === "error") {
        if (message.toLowerCase().includes("not configured")) {
          return t("marketData.toastUnavailable");
        }
        return t("marketData.toastFailed");
      }
      if (status === "cooldown") return t("marketData.toastCooldown");
      if (status === "partial") return t("marketData.toastPartial");
      return t("marketData.toastUpdated");
    };

    if (pending) {
      wasPendingRef.current = true;
      toastIdRef.current = toast.loading(t("marketData.toastLoading"), {
        id: toastIdRef.current,
        description: t("marketData.toastLoadingDescription"),
      });
      return;
    }

    if (!wasPendingRef.current) return;
    wasPendingRef.current = false;
    if (state.status === "idle" || !state.message) return;

    const id = toastIdRef.current;
    const title = titleForStatus(state.status, state.message);
    const description = state.message;

    if (state.status === "error") {
      toast.error(title, { id, description, duration: 7000 });
    } else if (state.status === "partial" || state.status === "cooldown") {
      toast.warning(title, { id, description, duration: 5500 });
    } else {
      toast.success(title, { id, description, duration: 3500 });
    }
  }, [pending, state, t]);

  const resolvedLabel = label ?? undefined;
  const ariaLabel = resolvedLabel ?? t("marketData.refreshAria");

  return (
    <form action={action} className="shrink-0">
      <button
        aria-label={ariaLabel}
        className={cn(
          resolvedLabel
            ? "ui-button ui-button-primary"
            : "grid size-9 place-items-center rounded-[var(--radius-md)] border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          "disabled:cursor-wait disabled:opacity-50",
          className,
        )}
        disabled={pending}
        title={state.message ?? t("marketData.refreshTitle")}
        type="submit"
      >
        <RefreshCw
          aria-hidden="true"
          className={cn(
            resolvedLabel ? "size-4" : "size-3.5",
            pending && "animate-spin",
          )}
        />
        {resolvedLabel
          ? pending
            ? t("marketData.refreshing")
            : resolvedLabel
          : null}
      </button>
    </form>
  );
}
