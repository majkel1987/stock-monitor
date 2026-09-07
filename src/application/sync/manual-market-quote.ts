import { z } from "zod";

const decimal = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,6})?$/, "Enter a positive price with up to 6 decimals.")
  .refine((value) => Number(value) > 0, "Price must be greater than zero.");

export const manualMarketQuoteSchema = z.object({
  stockId: z.uuid(),
  marketCode: z.enum(["GPW", "USA"]),
  ticker: z.string().trim().min(1).max(24),
  price: decimal,
  currency: z.enum(["PLN", "USD"]),
  asOf: z
    .string()
    .trim()
    .min(1, "Quote time is required.")
    .transform((value) => new Date(value))
    .refine(
      (value) => !Number.isNaN(value.getTime()),
      "Enter a valid quote time.",
    )
    .refine(
      (value) => value.getTime() <= Date.now() + 5 * 60_000,
      "Quote time cannot be in the future.",
    ),
});

export type ManualMarketQuoteInput = z.infer<typeof manualMarketQuoteSchema>;

export type ManualMarketQuoteResult =
  | "saved"
  | "quote_older_than_stored"
  | "invalid_stock"
  | "invalid_price"
  | "currency_mismatch"
  | "invalid_timestamp";

export interface ManualMarketQuoteWriter {
  submit(input: ManualMarketQuoteInput): Promise<ManualMarketQuoteResult>;
}
