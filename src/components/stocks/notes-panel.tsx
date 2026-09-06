"use client";

import { Archive, Pencil, Pin, PinOff, X } from "lucide-react";
import { useActionState, useState } from "react";
import type { ReactNode } from "react";

import {
  archiveNoteAction,
  createNoteAction,
  togglePinNoteAction,
  updateNoteAction,
} from "@/app/(app)/stocks/[market]/[ticker]/actions";
import {
  idleResearchActionState,
  type ResearchActionState,
} from "@/application/research/action-state";
import type { NoteView } from "@/application/stocks/research-types";
import { textareaClass } from "@/components/ui/terminal";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(value));
}

function NoteMutationButton({
  action,
  children,
  label,
  values,
}: {
  action: typeof archiveNoteAction;
  children: React.ReactNode;
  label: string;
  values: Record<string, string>;
}) {
  const [, formAction, pending] = useActionState(
    action,
    idleResearchActionState,
  );
  return (
    <form action={formAction}>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <button
        aria-label={label}
        className="grid size-6 place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
        disabled={pending}
        title={label}
        type="submit"
      >
        {children}
      </button>
    </form>
  );
}

export function NoteDialog({
  stockId,
  note = null,
  triggerLabel = "Add note",
  triggerClassName,
  triggerContent,
}: {
  stockId: string;
  note?: NoteView | null;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerContent?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const serverAction = note ? updateNoteAction : createNoteAction;
  const [state, action, pending] = useActionState(
    async (previousState: ResearchActionState, formData: FormData) => {
      const result = await serverAction(previousState, formData);
      if (result.status === "success") setOpen(false);
      return result;
    },
    idleResearchActionState,
  );

  return (
    <>
      <button
        className={
          triggerClassName ??
          "flex h-8 items-center justify-center rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold hover:bg-[var(--surface-hover)]"
        }
        onClick={() => setOpen(true)}
        type="button"
      >
        {triggerContent ?? triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55">
          <dialog
            aria-label={note ? "Edit note" : "Add note"}
            className="m-0 flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-3 rounded-[10px] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4 text-[var(--text-primary)]"
            open
          >
            <header className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">
                {note ? "Edit note" : "Add note"}
              </h2>
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-4 text-[var(--text-muted)]" />
              </button>
            </header>
            <form action={action} className="flex flex-col gap-3">
              <input name="stockId" type="hidden" value={stockId} />
              {note ? (
                <input name="noteId" type="hidden" value={note.id} />
              ) : null}
              <textarea
                autoFocus
                className={textareaClass}
                defaultValue={note?.content ?? ""}
                maxLength={10_000}
                name="content"
                placeholder="Write concise analytical notes…"
                required
              />
              {state.message ? (
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
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  className="h-8 rounded-[5px] px-3 text-xs font-semibold text-[var(--text-secondary)]"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-8 rounded-[5px] bg-[var(--accent-primary)] px-3 text-xs font-semibold text-[var(--bg-primary)] disabled:opacity-50"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? "Saving…" : note ? "Save note" : "Add note"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      ) : null}
    </>
  );
}

export function NotesPanel({
  stockId,
  notes,
}: {
  stockId: string;
  notes: NoteView[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold">Notes</h2>
        <NoteDialog
          stockId={stockId}
          triggerClassName="text-[10px] font-semibold text-[var(--accent-primary)]"
          triggerLabel="+ Quick add"
        />
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {notes.length ? (
          notes.map((note) => (
            <article
              className="group flex items-start gap-2 border-b border-[var(--border-subtle)] py-2"
              key={note.id}
            >
              {note.isPinned ? (
                <Pin className="mt-0.5 size-3 text-[var(--warning)]" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-[10px] leading-[14px] text-[var(--text-secondary)]">
                  {note.content}
                </p>
                <span className="mt-1 block font-mono text-[9px] text-[var(--text-muted)]">
                  {note.isPinned ? "PINNED · " : ""}
                  {dateLabel(note.createdAt)}
                </span>
              </div>
              <div className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <NoteDialog
                  note={note}
                  stockId={stockId}
                  triggerClassName="grid size-6 place-items-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  triggerContent={
                    <>
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Edit note</span>
                    </>
                  }
                  triggerLabel="Edit"
                />
                <NoteMutationButton
                  action={togglePinNoteAction}
                  label={note.isPinned ? "Unpin note" : "Pin note"}
                  values={{
                    stockId,
                    noteId: note.id,
                    isPinned: String(!note.isPinned),
                  }}
                >
                  {note.isPinned ? (
                    <PinOff className="size-3.5" />
                  ) : (
                    <Pin className="size-3.5" />
                  )}
                </NoteMutationButton>
                <NoteMutationButton
                  action={archiveNoteAction}
                  label="Archive note"
                  values={{ stockId, noteId: note.id }}
                >
                  <Archive className="size-3.5" />
                </NoteMutationButton>
              </div>
            </article>
          ))
        ) : (
          <p className="py-3 text-[10px] text-[var(--text-muted)]">No notes</p>
        )}
      </div>
    </div>
  );
}
