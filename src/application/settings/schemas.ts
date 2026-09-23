import { z } from "zod";

import { DASHBOARD_GROUPS } from "./types";

export const statusDraftSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(80),
  description: z.string().trim().max(280).optional().default(""),
  colorToken: z.string().trim().min(1, "Choose a color.").max(40),
  dashboardGroup: z.enum(DASHBOARD_GROUPS),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  isActive: z.boolean(),
});

export const createStatusSchema = statusDraftSchema;

export const updateStatusSchema = statusDraftSchema.extend({
  id: z.uuid("Choose a valid status."),
});

export const reorderStatusesSchema = z
  .array(z.uuid())
  .min(1)
  .max(100);
