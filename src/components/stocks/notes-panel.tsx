"use client";

import { Archive, Pencil, Pin, PinOff, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

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
import {
  ActionButton,
  SectionHeader,
  Surface,
  textareaClass,
} from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

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
  const [state, formAction, pending] = useActionState(
    action,
    idleResearchActionState,
  );
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }
    if (!wasPendingRef.current) return;
    wasPendingRef.current = false;
    if (state.status !== "success" || !state.message) return;
    toast.success(state.message);
  }, [pending, state.message, state.status]);

  return (
    <form action={formAction}>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <button
        aria-label={label}
        className="grid size-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const serverAction = note ? updateNoteAction : createNoteAction;
  const [state, action, pending] = useActionState(
    async (previousState: ResearchActionState, formData: FormData) => {
      const result = await serverAction(previousState, formData);
      if (result.status === "success") {
        toast.success(note ? "Note updated" : "Note added", {
          description: note
            ? "The note was saved."
            : "The note was added successfully.",
        });
        formRef.current?.reset();
        dialogRef.current?.close();
      }
      return result;
    },
    idleResearchActionState,
  );

  const closeDialog = () => dialogRef.current?.close();

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
        {triggerContent ?? triggerLabel}
      </button>
      <dialog
        aria-labelledby={note ? "edit-note-title" : "add-note-title"}
        className="m-auto w-[min(100%-1.5rem,24rem)] rounded-[var(--radius-dialog)] border border-border bg-popover p-0 text-popover-foreground shadow-[var(--shadow-lg)] backdrop:bg-black/70"
        ref={dialogRef}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <h2
            className="text-base font-semibold"
            id={note ? "edit-note-title" : "add-note-title"}
          >
            {note ? "Edit note" : "Add note"}
          </h2>
          <button
            aria-label="Close"
            className="grid size-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary"
            onClick={closeDialog}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>
        <form
          action={action}
          className="flex flex-col gap-4 p-4"
          ref={formRef}
        >
          <input name="stockId" type="hidden" value={stockId} />
          {note ? (
            <input name="noteId" type="hidden" value={note.id} />
          ) : null}
          <textarea
            className={cn(textareaClass, "min-h-32 text-base")}
            defaultValue={note?.content ?? ""}
            maxLength={10_000}
            name="content"
            placeholder="Write concise analytical notes…"
            required
          />
          {state.message && state.status === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <ActionButton onClick={closeDialog} type="button" variant="ghost">
              Cancel
            </ActionButton>
            <ActionButton disabled={pending} type="submit" variant="primary">
              {pending ? "Saving…" : note ? "Save note" : "Add note"}
            </ActionButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function NotesPanel({
  stockId,
  notes,
  className,
}: {
  stockId: string;
  notes: NoteView[];
  className?: string;
}) {
  return (
    <Surface className={cn("min-w-0", className)}>
      <SectionHeader
        action={
          <NoteDialog
            stockId={stockId}
            triggerClassName="inline-flex min-h-9 items-center text-sm font-semibold text-primary hover:underline"
            triggerLabel="+ Quick add"
          />
        }
        title="Notes"
      />
      <div className="px-4 sm:px-5">
        {notes.length ? (
          notes.map((note) => (
            <article
              className="group flex items-start gap-2 border-b border-[var(--border-subtle)] py-3.5 last:border-b-0"
              key={note.id}
            >
              {note.isPinned ? (
                <Pin
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-warning"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-secondary-foreground">
                  {note.content}
                </p>
                <span className="mt-1.5 block font-mono text-[0.8125rem] text-muted-foreground">
                  {note.isPinned ? "Pinned · " : ""}
                  {dateLabel(note.createdAt)}
                </span>
              </div>
              <div className="flex shrink-0 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <NoteDialog
                  note={note}
                  stockId={stockId}
                  triggerClassName="grid size-9 place-items-center rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary hover:text-foreground"
                  triggerContent={
                    <>
                      <Pencil aria-hidden="true" className="size-4" />
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
                    <PinOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Pin aria-hidden="true" className="size-4" />
                  )}
                </NoteMutationButton>
                <NoteMutationButton
                  action={archiveNoteAction}
                  label="Archive note"
                  values={{ stockId, noteId: note.id }}
                >
                  <Archive aria-hidden="true" className="size-4" />
                </NoteMutationButton>
              </div>
            </article>
          ))
        ) : (
          <p className="py-4 text-sm leading-relaxed text-muted-foreground">
            No notes yet.
          </p>
        )}
      </div>
    </Surface>
  );
}
