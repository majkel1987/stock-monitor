import { z } from "zod";

const optionalInteger = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().int().min(0).max(10_000).nullable(),
);

export const priceLevelSchema = z.object({
  stockId: z.uuid(),
  label: z.string().trim().min(1, "Label is required.").max(80),
  kind: z.enum(["buy", "fair_value", "sell", "custom"]),
  value: z.coerce.number().positive("Price must be greater than zero.").max(1e12),
  currency: z.enum(["PLN", "USD"]),
  triggerDirection: z.enum(["lte", "gte"]),
  priority: optionalInteger,
  sortOrder: z.coerce.number().int().min(0).max(10_000),
  note: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(1_000).nullable(),
  ),
});

export const updatePriceLevelSchema = priceLevelSchema.extend({ levelId: z.uuid() });
export const deactivatePriceLevelSchema = z.object({
  stockId: z.uuid(),
  levelId: z.uuid(),
});
