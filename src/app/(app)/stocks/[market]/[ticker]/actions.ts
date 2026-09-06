"use server";

import { revalidatePath } from "next/cache";

import { archiveNote, createNote, togglePinNote, updateNote } from "@/application/notes/manage-note";
import {
  archiveNoteSchema,
  createNoteSchema,
  togglePinNoteSchema,
  updateNoteSchema,
} from "@/application/notes/schemas";
import {
  createPriceLevel,
  deactivatePriceLevel,
  updatePriceLevel,
} from "@/application/price-levels/manage-price-level";
import {
  deactivatePriceLevelSchema,
  priceLevelSchema,
  updatePriceLevelSchema,
} from "@/application/price-levels/schemas";
import type { ResearchActionState } from "@/application/research/action-state";
import {
  createSupabaseNoteWriter,
  createSupabasePriceLevelWriter,
  ResearchInfrastructureError,
} from "@/infrastructure/supabase/queries/research";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

function refreshResearch() {
  revalidatePath("/stocks/[market]/[ticker]", "page");
  revalidatePath("/watchlist");
}

function invalidInput(error: { flatten(): { fieldErrors: Record<string, string[]> } }) {
  return {
    status: "error" as const,
    message: "Check the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

async function withSafeMutation(
  mutation: (userId: string, client: Awaited<ReturnType<typeof createClient>>) => Promise<boolean>,
  successMessage: string,
): Promise<ResearchActionState> {
  const user = await requireAllowedUser();
  try {
    const client = await createClient("writable");
    if (!(await mutation(user.id, client))) {
      return { status: "error", message: "The research record was not found." };
    }
    refreshResearch();
    return { status: "success", message: successMessage };
  } catch (error) {
    if (error instanceof ResearchInfrastructureError) {
      return {
        status: "error",
        message: "The change could not be saved. Check ownership and stock currency.",
      };
    }
    throw error;
  }
}

export async function createPriceLevelAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const parsed = priceLevelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidInput(parsed.error);
  return withSafeMutation(
    (userId, client) =>
      createPriceLevel(createSupabasePriceLevelWriter(client), userId, parsed.data),
    "Price level added.",
  );
}

export async function updatePriceLevelAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const parsed = updatePriceLevelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidInput(parsed.error);
  const { levelId, ...input } = parsed.data;
  return withSafeMutation(
    (userId, client) =>
      updatePriceLevel(createSupabasePriceLevelWriter(client), userId, levelId, input),
    "Price level updated.",
  );
}

export async function deactivatePriceLevelAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const parsed = deactivatePriceLevelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidInput(parsed.error);
  return withSafeMutation(
    (userId, client) =>
      deactivatePriceLevel(
        createSupabasePriceLevelWriter(client),
        userId,
        parsed.data.levelId,
        parsed.data.stockId,
      ),
    "Price level deactivated.",
  );
}

export async function createNoteAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const parsed = createNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidInput(parsed.error);
  return withSafeMutation(
    (userId, client) => createNote(createSupabaseNoteWriter(client), userId, parsed.data),
    "Note added.",
  );
}

export async function updateNoteAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const parsed = updateNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidInput(parsed.error);
  const { noteId, ...input } = parsed.data;
  return withSafeMutation(
    (userId, client) =>
      updateNote(createSupabaseNoteWriter(client), userId, noteId, input),
    "Note updated.",
  );
}

export async function togglePinNoteAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const parsed = togglePinNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidInput(parsed.error);
  return withSafeMutation(
    (userId, client) =>
      togglePinNote(
        createSupabaseNoteWriter(client),
        userId,
        parsed.data.noteId,
        parsed.data.stockId,
        parsed.data.isPinned,
      ),
    parsed.data.isPinned ? "Note pinned." : "Note unpinned.",
  );
}

export async function archiveNoteAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const parsed = archiveNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidInput(parsed.error);
  return withSafeMutation(
    (userId, client) =>
      archiveNote(
        createSupabaseNoteWriter(client),
        userId,
        parsed.data.noteId,
        parsed.data.stockId,
      ),
    "Note archived.",
  );
}
