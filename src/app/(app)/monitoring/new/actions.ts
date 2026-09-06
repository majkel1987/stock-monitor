"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createMonitoring } from "@/application/monitoring/create-monitoring";
import { createMonitoringSchema } from "@/application/monitoring/schemas";
import type { ResearchActionState } from "@/application/research/action-state";
import {
  createSupabaseMonitoringWriter,
  ResearchInfrastructureError,
} from "@/infrastructure/supabase/queries/research";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

export async function createMonitoringAction(
  _previousState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  const user = await requireAllowedUser();
  const parsed = createMonitoringSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted monitoring fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let outcome: Awaited<ReturnType<typeof createMonitoring>>;
  try {
    const client = await createClient("writable");
    outcome = await createMonitoring(
      createSupabaseMonitoringWriter(client),
      user.id,
      parsed.data,
    );
  } catch (error) {
    if (error instanceof ResearchInfrastructureError) {
      return {
        status: "error",
        message:
          "The monitoring transaction failed. No research data was saved.",
      };
    }
    throw error;
  }

  if (outcome.status !== "created") {
    const messages = {
      invalid_stock: "The stock is not on your watchlist.",
      invalid_status: "Choose an active status that belongs to your account.",
      invalid_currency: "The price currency must match the stock currency.",
      invalid_fx: "USD/PLN can only be stored for USD monitoring.",
      invalid_supersedes: "The corrected monitoring record is not valid.",
    } as const;
    return { status: "error", message: messages[outcome.status] };
  }

  const market = parsed.data.marketCode.toLowerCase();
  const ticker = parsed.data.ticker;
  revalidatePath("/watchlist");
  revalidatePath("/stocks/[market]/[ticker]", "page");
  redirect(`/stocks/${market}/${encodeURIComponent(ticker)}`);
}
