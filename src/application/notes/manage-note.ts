import type { NoteWriter, SaveNoteInput } from "./types";

export function createNote(
  writer: NoteWriter,
  userId: string,
  input: SaveNoteInput,
) {
  return writer.create(userId, input);
}

export function updateNote(
  writer: NoteWriter,
  userId: string,
  noteId: string,
  input: SaveNoteInput,
) {
  return writer.update(userId, noteId, input);
}

export function togglePinNote(
  writer: NoteWriter,
  userId: string,
  noteId: string,
  stockId: string,
  isPinned: boolean,
) {
  return writer.togglePin(userId, noteId, stockId, isPinned);
}

export function archiveNote(
  writer: NoteWriter,
  userId: string,
  noteId: string,
  stockId: string,
) {
  return writer.archive(userId, noteId, stockId);
}
