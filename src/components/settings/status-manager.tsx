"use client";

import { Ellipsis, GripVertical, Plus, X } from "lucide-react";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  reorderStatusesAction,
  saveStatusAction,
} from "@/app/(app)/settings/actions";
import { initialSaveStatusState } from "@/application/settings/action-state";
import { applyStatusOrder } from "@/application/settings/slug";
import type { WorkflowStatus } from "@/application/settings/types";
import { ActionButton, EmptyState, PageHeader, Surface } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

import { colorSwatchClass, dashboardGroupLabel } from "./format";
import { SettingsTabs } from "./settings-tabs";
import {
  draftFromStatus,
  emptyStatusDraft,
  isStatusDraftDirty,
  StatusEditor,
  type StatusDraft,
} from "./status-editor";

const DESKTOP_QUERY = "(min-width: 1024px)";

const nextSortOrder = (statuses: readonly WorkflowStatus[]) =>
  statuses.reduce((max, status) => Math.max(max, status.sortOrder), 0) + 10;

export function StatusManager({
  statuses,
}: {
  statuses: WorkflowStatus[];
}) {
  const dragIdRef = useRef<string | null>(null);
  const menuId = useId();

  const [orderedIds, setOrderedIds] = useState(() =>
    statuses.map((status) => status.id),
  );
  const [mode, setMode] = useState<"create" | "edit">(
    statuses.length ? "edit" : "create",
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    statuses[0]?.id ?? null,
  );
  const [draft, setDraft] = useState<StatusDraft>(
    statuses[0]
      ? draftFromStatus(statuses[0])
      : emptyStatusDraft(nextSortOrder(statuses)),
  );
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [handledSuccessKey, setHandledSuccessKey] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const [saveState, saveAction, pending] = useActionState(
    saveStatusAction,
    initialSaveStatusState,
  );
  const saveWasPendingRef = useRef(false);

  const items = applyStatusOrder(statuses, orderedIds);
  const selected =
    mode === "edit"
      ? (items.find((item) => item.id === selectedId) ?? null)
      : null;
  const original = selected ? draftFromStatus(selected) : null;
  const canSave =
    Boolean(draft.label.trim()) && isStatusDraftDirty(draft, original);

  const successKey =
    saveState.status === "success"
      ? `${saveState.kind}:${saveState.statusId}`
      : "";
  if (successKey && successKey !== handledSuccessKey && !pending) {
    setHandledSuccessKey(successKey);
    setMode("edit");
    setSheetOpen(false);
    if (saveState.statusId) setSelectedId(saveState.statusId);
  }

  useEffect(() => {
    if (pending) {
      saveWasPendingRef.current = true;
      return;
    }
    if (!saveWasPendingRef.current) return;
    saveWasPendingRef.current = false;

    if (saveState.status === "success") {
      toast.success(
        saveState.kind === "created" ? "Status created" : "Status updated",
        {
          description: saveState.message,
          duration: 3500,
        },
      );
      return;
    }

    if (saveState.status === "error" && saveState.message) {
      toast.error("Could not save status", {
        description: saveState.message,
        duration: 7000,
      });
    }
  }, [pending, saveState]);

  useEffect(() => {
    if (!menuOpenId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-status-menu]")) return;
      setMenuOpenId(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpenId]);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = () => {
      if (media.matches) setSheetOpen(false);
    };
    closeOnDesktop();
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sheetOpen]);

  const openEditor = () => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) setSheetOpen(true);
  };

  const handleSelect = (status: WorkflowStatus) => {
    setMode("edit");
    setSelectedId(status.id);
    setDraft(draftFromStatus(status));
    setMenuOpenId(null);
    openEditor();
  };

  const handleNew = () => {
    setMode("create");
    setSelectedId(null);
    setDraft(emptyStatusDraft(nextSortOrder(items)));
    setMenuOpenId(null);
    openEditor();
  };

  const handleCancel = () => {
    if (mode === "create") {
      const first = items[0];
      if (first) {
        setMode("edit");
        setSelectedId(first.id);
        setDraft(draftFromStatus(first));
      } else {
        setDraft(emptyStatusDraft(10));
      }
    } else if (selected) {
      setDraft(draftFromStatus(selected));
    }
    setSheetOpen(false);
  };

  const persistOrder = async (next: WorkflowStatus[]) => {
    const previous = orderedIds;
    setOrderedIds(next.map((item) => item.id));
    const result = await reorderStatusesAction(next.map((item) => item.id));
    if (result.status === "error") {
      setOrderedIds(previous);
      toast.error("Could not save status", {
        description: result.message ?? "The status order could not be saved.",
        duration: 7000,
      });
    }
  };

  const handleMove = (id: string, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const orderedIds = items.map((item) => item.id);
    const [moved] = orderedIds.splice(index, 1);
    if (!moved) return;
    orderedIds.splice(target, 0, moved);
    void persistOrder(applyStatusOrder(items, orderedIds));
    setMenuOpenId(null);
  };

  const handleDrop = (targetId: string) => {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    setDropTargetId(null);
    if (!sourceId || sourceId === targetId) return;
    const orderedIds = items.map((item) => item.id);
    const from = orderedIds.indexOf(sourceId);
    const to = orderedIds.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = orderedIds.splice(from, 1);
    if (!moved) return;
    orderedIds.splice(to, 0, moved);
    void persistOrder(applyStatusOrder(items, orderedIds));
  };

  const editor = (showIntro: boolean) => (
    <StatusEditor
      action={saveAction}
      canSave={canSave}
      draft={draft}
      errorMessage={
        saveState.status === "error" ? saveState.message : undefined
      }
      mode={mode}
      onCancel={handleCancel}
      onChange={setDraft}
      pending={pending}
      showIntro={showIntro}
      statusId={selectedId}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        description="Konfiguracja etykiet workflow badań i operacji na danych"
        eyebrow="Settings"
        index
        title="Ustawienia"
      >
        <ActionButton
          className="w-full sm:w-auto"
          onClick={handleNew}
          type="button"
          variant="primary"
        >
          <Plus aria-hidden="true" className="size-4" />
          New status
        </ActionButton>
      </PageHeader>

      <SettingsTabs active="statuses" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
        {items.length === 0 ? (
          <Surface>
            <EmptyState
              action={
                <ActionButton onClick={handleNew} type="button" variant="primary">
                  <Plus aria-hidden="true" className="size-4" />
                  New status
                </ActionButton>
              }
              description="Create your first status to organize monitoring and research decisions."
              title="No workflow statuses yet."
            />
          </Surface>
        ) : (
          <Surface className="min-w-0">
            <ul className="flex flex-col md:hidden">
              {items.map((status, index) => (
                <li
                  className={cn(
                    "border-b border-[var(--border-subtle)] last:border-b-0",
                    dropTargetId === status.id && "bg-accent/60",
                  )}
                  key={status.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTargetId(status.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(status.id);
                  }}
                >
                  <StatusMobileCard
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    isSelected={mode === "edit" && selectedId === status.id}
                    menuId={menuId}
                    menuOpen={menuOpenId === status.id}
                    onDragEnd={() => {
                      dragIdRef.current = null;
                      setDropTargetId(null);
                    }}
                    onDragStart={() => {
                      dragIdRef.current = status.id;
                    }}
                    onEdit={() => handleSelect(status)}
                    onMenuOpenChange={(open) =>
                      setMenuOpenId(open ? status.id : null)
                    }
                    onMoveDown={() => handleMove(status.id, 1)}
                    onMoveUp={() => handleMove(status.id, -1)}
                    status={status}
                  />
                </li>
              ))}
            </ul>

            <ul className="hidden md:flex md:flex-col">
              {items.map((status, index) => (
                <li
                  className={cn(
                    "border-b border-[var(--border-subtle)] last:border-b-0",
                    dropTargetId === status.id && "bg-accent/60",
                  )}
                  key={status.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDropTargetId(status.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDrop(status.id);
                  }}
                >
                  <StatusRow
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    isSelected={mode === "edit" && selectedId === status.id}
                    menuId={menuId}
                    menuOpen={menuOpenId === status.id}
                    onDragEnd={() => {
                      dragIdRef.current = null;
                      setDropTargetId(null);
                    }}
                    onDragStart={() => {
                      dragIdRef.current = status.id;
                    }}
                    onEdit={() => handleSelect(status)}
                    onMenuOpenChange={(open) =>
                      setMenuOpenId(open ? status.id : null)
                    }
                    onMoveDown={() => handleMove(status.id, 1)}
                    onMoveUp={() => handleMove(status.id, -1)}
                    status={status}
                  />
                </li>
              ))}
            </ul>
          </Surface>
        )}

          <div
            aria-labelledby={sheetOpen ? "status-editor-title" : undefined}
            aria-modal={sheetOpen ? true : undefined}
            className={cn(
              sheetOpen
                ? "fixed inset-0 z-50 flex h-dvh max-h-dvh flex-col pb-[env(safe-area-inset-bottom)]"
                : "hidden min-h-[32rem] lg:flex lg:flex-col",
            )}
            role={sheetOpen ? "dialog" : undefined}
          >
            <Surface
              className={cn(
                "flex min-h-0 flex-1 flex-col bg-card",
                sheetOpen && "rounded-none",
              )}
            >
            {sheetOpen ? (
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5 lg:hidden">
                <div className="min-w-0">
                  <h2
                    className="text-base font-semibold"
                    id="status-editor-title"
                  >
                    {mode === "create" ? "New status" : "Edit status"}
                  </h2>
                  <p className="pt-1 text-sm text-muted-foreground">
                    Update how this status is presented and grouped across the
                    application.
                  </p>
                </div>
                <button
                  aria-label="Close status editor"
                  className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
                  onClick={() => setSheetOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            ) : null}
            {mode === "create" || selected ? (
              editor(!sheetOpen)
            ) : (
              <div className="p-6">
                <h2 className="text-card-title">Edit status</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Select a status from the list to edit it.
                </p>
              </div>
            )}
            </Surface>
          </div>
        </div>
    </div>
  );
}

function StatusRow({
  status,
  isSelected,
  isFirst,
  isLast,
  menuOpen,
  menuId,
  onEdit,
  onMenuOpenChange,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
}: {
  status: WorkflowStatus;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  menuOpen: boolean;
  menuId: string;
  onEdit: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      aria-selected={isSelected}
      className={cn(
        "flex items-start gap-1 border-l-2 px-2 py-3 transition-colors hover:bg-secondary/70",
        isSelected
          ? "border-l-primary bg-accent/80"
          : "border-l-transparent",
      )}
    >
      <button
        aria-label={`Reorder ${status.label}`}
        className="grid size-9 shrink-0 cursor-grab place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing"
        draggable
        onClick={(event) => event.stopPropagation()}
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", status.id);
          onDragStart();
        }}
        type="button"
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>

      <button
        className="flex min-w-0 flex-1 flex-col gap-2 text-left"
        onClick={onEdit}
        type="button"
      >
        <span className="flex min-w-0 flex-col">
          <strong className="truncate text-[0.9375rem] font-semibold leading-snug">
            {status.label}
          </strong>
          {status.description ? (
            <span className="line-clamp-2 text-[0.8125rem] leading-normal text-muted-foreground">
              {status.description}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            aria-label={`Color ${status.colorToken}`}
            className={cn(
              "size-5 rounded-[var(--radius-sm)] border border-border",
              colorSwatchClass(status.colorToken),
            )}
          />
          <span className="rounded-[var(--radius-sm)] border border-border bg-muted px-2 py-0.5 text-[0.8125rem] font-medium text-secondary-foreground">
            {dashboardGroupLabel(status.dashboardGroup)}
          </span>
          <span className="font-mono text-[0.8125rem] tabular-nums text-muted-foreground">
            {status.sortOrder}
          </span>
          <span
            className={cn(
              "text-[0.8125rem] font-medium",
              status.isActive ? "text-positive" : "text-muted-foreground",
            )}
          >
            {status.isActive ? "Active" : "Inactive"}
          </span>
        </span>
      </button>

      <StatusActionsMenu
        isFirst={isFirst}
        isLast={isLast}
        menuId={`${menuId}-${status.id}`}
        onEdit={onEdit}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onOpenChange={onMenuOpenChange}
        open={menuOpen}
        statusLabel={status.label}
      />
    </div>
  );
}

function StatusMobileCard({
  status,
  isSelected,
  isFirst,
  isLast,
  menuOpen,
  menuId,
  onEdit,
  onMenuOpenChange,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
}: {
  status: WorkflowStatus;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  menuOpen: boolean;
  menuId: string;
  onEdit: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      className={cn(
        "flex gap-1 border-l-2 p-3 transition-colors",
        isSelected ? "border-l-primary bg-accent/80" : "border-l-transparent",
      )}
    >
      <button
        aria-label={`Reorder ${status.label}`}
        className="grid size-9 shrink-0 cursor-grab place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing"
        draggable
        onClick={(event) => event.stopPropagation()}
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", status.id);
          onDragStart();
        }}
        type="button"
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <button className="min-w-0 text-left" onClick={onEdit} type="button">
          <strong className="block truncate text-[0.9375rem] font-semibold leading-snug">
            {status.label}
          </strong>
          {status.description ? (
            <span className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-normal text-muted-foreground">
              {status.description}
            </span>
          ) : null}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              aria-label={`Color ${status.colorToken}`}
              className={cn(
                "size-5 rounded-[var(--radius-sm)] border border-border",
                colorSwatchClass(status.colorToken),
              )}
            />
            <span className="rounded-[var(--radius-sm)] border border-border bg-muted px-2 py-0.5 text-[0.8125rem] font-medium text-secondary-foreground">
              {dashboardGroupLabel(status.dashboardGroup)}
            </span>
            <span
              className={cn(
                "text-[0.8125rem] font-medium",
                status.isActive ? "text-positive" : "text-muted-foreground",
              )}
            >
              {status.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <span className="font-mono text-[0.8125rem] tabular-nums text-muted-foreground">
            Sort {status.sortOrder}
          </span>
        </div>
      </div>
      <StatusActionsMenu
        isFirst={isFirst}
        isLast={isLast}
        menuId={`${menuId}-${status.id}`}
        onEdit={onEdit}
        onMoveDown={onMoveDown}
        onMoveUp={onMoveUp}
        onOpenChange={onMenuOpenChange}
        open={menuOpen}
        statusLabel={status.label}
      />
    </article>
  );
}

function StatusActionsMenu({
  open,
  menuId,
  statusLabel,
  isFirst,
  isLast,
  onOpenChange,
  onEdit,
  onMoveUp,
  onMoveDown,
}: {
  open: boolean;
  menuId: string;
  statusLabel: string;
  isFirst: boolean;
  isLast: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="relative shrink-0" data-status-menu>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${statusLabel}`}
        className="grid size-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
        type="button"
      >
        <Ellipsis aria-hidden="true" className="size-4" />
      </button>
      {open ? (
        <div
          className="absolute top-10 right-0 z-20 min-w-40 rounded-[var(--radius-md)] border border-border bg-popover p-1 shadow-[var(--shadow-md)]"
          id={menuId}
          role="menu"
        >
          <button
            className="flex min-h-9 w-full items-center rounded-[var(--radius-sm)] px-3 text-left text-sm hover:bg-secondary"
            onClick={onEdit}
            role="menuitem"
            type="button"
          >
            Edit
          </button>
          <button
            className="flex min-h-9 w-full items-center rounded-[var(--radius-sm)] px-3 text-left text-sm hover:bg-secondary disabled:text-muted-foreground"
            disabled={isFirst}
            onClick={onMoveUp}
            role="menuitem"
            type="button"
          >
            Move up
          </button>
          <button
            className="flex min-h-9 w-full items-center rounded-[var(--radius-sm)] px-3 text-left text-sm hover:bg-secondary disabled:text-muted-foreground"
            disabled={isLast}
            onClick={onMoveDown}
            role="menuitem"
            type="button"
          >
            Move down
          </button>
        </div>
      ) : null}
    </div>
  );
}
