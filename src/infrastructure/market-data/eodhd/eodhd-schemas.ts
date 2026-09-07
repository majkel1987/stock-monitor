import { z } from "zod";

export const eodhdSearchResponseSchema = z.array(
  z
    .object({
      Code: z.string().trim().min(1),
      Exchange: z.string().trim().min(1),
      Name: z.string().trim().min(1),
      Currency: z.string().trim().length(3),
      ISIN: z.string().trim().nullable().optional(),
      Isin: z.string().trim().nullable().optional(),
    })
    .passthrough(),
);

export const eodhdQuoteSchema = z
  .object({
    code: z.string().trim().min(1),
    timestamp: z.number().int().positive(),
    close: z.number().finite().positive(),
    previousClose: z.number().finite().positive().nullable().optional(),
    change_p: z.number().finite().nullable().optional(),
    volume: z.number().finite().nonnegative().nullable().optional(),
  })
  .passthrough();

export const eodhdQuoteResponseSchema = z.union([
  eodhdQuoteSchema,
  z.array(eodhdQuoteSchema),
]);

export type EodhdSearchRow = z.infer<typeof eodhdSearchResponseSchema>[number];
export type EodhdQuoteRow = z.infer<typeof eodhdQuoteSchema>;
