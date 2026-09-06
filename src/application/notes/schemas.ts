import { z } from "zod";

const noteBase = z.object({
  stockId: z.uuid(),
  content: z
    .string()
    .trim()
    .min(1, "Note cannot be empty.")
    .max(10_000, "Note cannot exceed 10,000 characters."),
});

export const createNoteSchema = noteBase;
export const updateNoteSchema = noteBase.extend({ noteId: z.uuid() });
export const togglePinNoteSchema = z.object({
  stockId: z.uuid(),
  noteId: z.uuid(),
  isPinned: z.enum(["true", "false"]).transform((value) => value === "true"),
});
export const archiveNoteSchema = z.object({
  stockId: z.uuid(),
  noteId: z.uuid(),
});
