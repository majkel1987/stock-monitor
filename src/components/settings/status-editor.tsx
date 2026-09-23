import type { FormHTMLAttributes } from "react";

import type { WorkflowStatus } from "@/application/settings/types";
import {
  COLOR_TOKENS,
  DASHBOARD_GROUPS,
} from "@/application/settings/types";
import { ActionButton, Field, controlClass } from "@/components/ui/terminal";
import { WatchlistStatusBadge } from "@/components/watchlist/watchlist-badges";
import { cn } from "@/lib/utils/cn";

import {
  COLOR_TOKEN_LABELS,
  DASHBOARD_GROUP_LABELS,
  colorSwatchClass,
} from "./format";

export type StatusDraft = {
  label: string;
  description: string;
  colorToken: string;
  dashboardGroup: WorkflowStatus["dashboardGroup"];
  sortOrder: number;
  isActive: boolean;
};

export function emptyStatusDraft(sortOrder: number): StatusDraft {
  return {
    label: "",
    description: "",
    colorToken: "accent",
    dashboardGroup: "watch",
    sortOrder,
    isActive: true,
  };
}

export function draftFromStatus(status: WorkflowStatus): StatusDraft {
  return {
    label: status.label,
    description: status.description ?? "",
    colorToken: status.colorToken,
    dashboardGroup: status.dashboardGroup,
    sortOrder: status.sortOrder,
    isActive: status.isActive,
  };
}

export function isStatusDraftDirty(
  draft: StatusDraft,
  original: StatusDraft | null,
) {
  if (!original) return draft.label.trim().length > 0;
  return (
    draft.label !== original.label ||
    draft.description !== original.description ||
    draft.colorToken !== original.colorToken ||
    draft.dashboardGroup !== original.dashboardGroup ||
    draft.sortOrder !== original.sortOrder ||
    draft.isActive !== original.isActive
  );
}

export function StatusEditor({
  mode,
  statusId,
  draft,
  onChange,
  onCancel,
  pending,
  canSave,
  errorMessage,
  formId = "status-editor-form",
  action,
  showIntro = true,
}: {
  mode: "create" | "edit";
  statusId: string | null;
  draft: StatusDraft;
  onChange: (draft: StatusDraft) => void;
  onCancel: () => void;
  pending: boolean;
  canSave: boolean;
  errorMessage?: string;
  formId?: string;
  action: FormHTMLAttributes<HTMLFormElement>["action"];
  showIntro?: boolean;
}) {
  const knownTokens = new Set<string>(COLOR_TOKENS);
  const colorOptions = knownTokens.has(draft.colorToken)
    ? COLOR_TOKENS
    : [draft.colorToken, ...COLOR_TOKENS];

  const handleChange = (patch: Partial<StatusDraft>) => {
    onChange({ ...draft, ...patch });
  };

  return (
    <form
      action={action}
      className="flex min-h-0 flex-1 flex-col"
      id={formId}
      onSubmit={(event) => {
        if (!canSave || pending) event.preventDefault();
      }}
    >
      <input name="mode" type="hidden" value={mode} />
      {statusId ? <input name="id" type="hidden" value={statusId} /> : null}
      <input name="isActive" type="hidden" value={draft.isActive ? "true" : "false"} />

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
        {showIntro ? (
          <header className="flex flex-col gap-1">
            <h2 className="text-card-title">
              {mode === "create" ? "New status" : "Edit status"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Update how this status is presented and grouped across the
              application.
            </p>
          </header>
        ) : null}

        <Field label="Label">
          <input
            autoComplete="off"
            className={controlClass}
            maxLength={80}
            name="label"
            onChange={(event) => handleChange({ label: event.target.value })}
            placeholder="Buy Candidate"
            required
            value={draft.label}
          />
        </Field>

        <Field label="Description">
          <input
            autoComplete="off"
            className={controlClass}
            maxLength={280}
            name="description"
            onChange={(event) =>
              handleChange({ description: event.target.value })
            }
            placeholder="High-priority accumulation candidate"
            value={draft.description}
          />
        </Field>

        <Field label="Dashboard group">
          <select
            className={controlClass}
            name="dashboardGroup"
            onChange={(event) =>
              handleChange({
                dashboardGroup: event.target
                  .value as StatusDraft["dashboardGroup"],
              })
            }
            value={draft.dashboardGroup}
          >
            {DASHBOARD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {DASHBOARD_GROUP_LABELS[group]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <Field label="Color">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-6 shrink-0 rounded-[var(--radius-sm)] border border-border",
                  colorSwatchClass(draft.colorToken),
                )}
              />
              <select
                className={cn(controlClass, "min-w-0 flex-1")}
                name="colorToken"
                onChange={(event) =>
                  handleChange({ colorToken: event.target.value })
                }
                value={draft.colorToken}
              >
                {colorOptions.map((token) => (
                  <option key={token} value={token}>
                    {COLOR_TOKEN_LABELS[token] ?? token}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Sort order">
            <input
              className={controlClass}
              min={0}
              name="sortOrder"
              onChange={(event) =>
                handleChange({
                  sortOrder: Number(event.target.value) || 0,
                })
              }
              step={1}
              type="number"
              value={draft.sortOrder}
            />
          </Field>
        </div>

        <label className="flex min-h-11 items-center gap-3">
          <input
            checked={draft.isActive}
            className="size-5 accent-primary"
            onChange={(event) =>
              handleChange({ isActive: event.target.checked })
            }
            type="checkbox"
          />
          <span className="text-sm font-medium">Active status</span>
        </label>

        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-muted/60 p-4">
          <span className="ui-meta font-semibold tracking-wide uppercase">
            Preview
          </span>
          <div>
            <WatchlistStatusBadge
              colorToken={draft.colorToken}
              label={draft.label.trim() || "Status label"}
            />
          </div>
        </div>

        {errorMessage ? (
          <p
            aria-live="polite"
            className="rounded-[var(--radius-sm)] border border-negative bg-[var(--negative-subtle)] p-3 text-sm text-negative"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] p-4 sm:flex-row sm:justify-end sm:p-5">
        <ActionButton
          className="w-full sm:w-auto"
          onClick={onCancel}
          type="button"
          variant="ghost"
        >
          Cancel
        </ActionButton>
        <ActionButton
          className="w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canSave || pending}
          type="submit"
          variant="primary"
        >
          {pending ? "Saving…" : "Save changes"}
        </ActionButton>
      </div>
    </form>
  );
}
