"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  deletePortfolioTransactionAction,
  idlePortfolioActionState,
} from "@/app/(app)/portfolio/actions";

export function DeleteInvestmentButton({
  transactionId,
}: {
  transactionId: string;
}) {
  const [state, action, pending] = useActionState(
    deletePortfolioTransactionAction,
    idlePortfolioActionState,
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    if (state.status === "success") {
      toast.success("Investment deleted", { description: state.message });
    } else if (state.status === "error") {
      toast.error("Delete failed", { description: state.message });
    }
  }, [pending, state.message, state.status]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete this BUY transaction?"))
          event.preventDefault();
      }}
    >
      <input name="transactionId" type="hidden" value={transactionId} />
      <button
        aria-label="Delete investment"
        className="grid size-11 place-items-center rounded-[var(--radius-sm)] text-negative hover:bg-[var(--negative-subtle)] focus-visible:outline-none disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}
