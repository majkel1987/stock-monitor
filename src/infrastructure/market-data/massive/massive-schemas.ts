import { z } from "zod";

export const massiveTickerResponseSchema = z
  .object({
    status: z.string(),
    results: z
      .array(
        z
          .object({
            ticker: z.string().trim().min(1),
            name: z.string().trim().min(1),
            market: z.string().trim().min(1),
            primary_exchange: z.string().trim().min(1).optional(),
            currency_name: z.string().trim().min(1).optional(),
            active: z.boolean().optional(),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();

export const massivePreviousDayResponseSchema = z
  .object({
    status: z.string(),
    ticker: z.string().trim().min(1),
    results: z
      .array(
        z
          .object({
            T: z.string().trim().min(1),
            o: z.number().finite().positive(),
            h: z.number().finite().positive(),
            l: z.number().finite().positive(),
            c: z.number().finite().positive(),
            v: z.number().finite().nonnegative(),
            t: z.number().int().positive(),
          })
          .refine((row) => row.h >= row.l)
          .passthrough(),
      )
      .max(1),
  })
  .passthrough();

export type MassiveTickerRow = z.infer<
  typeof massiveTickerResponseSchema
>["results"][number];
export type MassivePreviousDayRow = z.infer<
  typeof massivePreviousDayResponseSchema
>["results"][number];
