import { z } from "zod";

export const nbpRateResponseSchema = z.object({
  table: z.literal("A"),
  currency: z.string().min(1),
  code: z.literal("USD"),
  rates: z
    .array(
      z.object({
        no: z.string().min(1),
        effectiveDate: z.iso.date(),
        mid: z.number().finite().positive(),
      }),
    )
    .min(1),
});
