import { z } from "zod";

function localizedPositiveDecimal(label: string, fractionalDigits: number) {
  return z
    .string()
    .transform((value) => value.trim().replace(/[\s\u00a0]/g, ""))
    .refine(
      (value) => !(value.includes(",") && value.includes(".")),
      `${label} must use one decimal separator.`,
    )
    .transform((value) => value.replace(",", "."))
    .refine(
      (value) =>
        new RegExp(`^\\d+(?:\\.\\d{1,${fractionalDigits}})?$`).test(value),
      `${label} must be a valid number with up to ${fractionalDigits} decimal places.`,
    )
    .refine((value) => Number(value) > 0, `${label} must be greater than zero.`)
    .refine(
      (value) => value.split(".")[0]!.length <= 20 - fractionalDigits,
      `${label} is too large.`,
    );
}

const transactionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid purchase date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  }, "Enter a valid purchase date.");

export const createPortfolioTransactionSchema = z.object({
  stockId: z.uuid("Choose a company."),
  transactionDate: transactionDateSchema,
  quantity: localizedPositiveDecimal("Quantity", 8),
  pricePerShare: localizedPositiveDecimal("Purchase price", 6),
});

export const updatePortfolioTransactionSchema = createPortfolioTransactionSchema
  .omit({ stockId: true })
  .extend({
    transactionId: z.uuid("Choose a valid transaction."),
  });

export const deletePortfolioTransactionSchema = z.object({
  transactionId: z.uuid("Choose a valid transaction."),
});
