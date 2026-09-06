import { z } from "zod";

const nullableText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

const optionalScore = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.coerce.number().int().min(0).max(100).nullable(),
);

function listText(maxItems: number) {
  return z
    .string()
    .max(5_000)
    .transform((value, context) => {
      const items = value
        .split(/[;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length > maxItems) {
        context.addIssue({
          code: "custom",
          message: `Use no more than ${maxItems} items.`,
        });
        return z.NEVER;
      }
      if (items.some((item) => item.length > 500)) {
        context.addIssue({
          code: "custom",
          message: "Each item must be 500 characters or fewer.",
        });
        return z.NEVER;
      }
      return items;
    });
}

export const createMonitoringSchema = z
  .object({
    stockId: z.uuid(),
    marketCode: z.enum(["GPW", "USA"]),
    ticker: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[A-Za-z0-9.-]+$/),
    statusDefinitionId: z.uuid("Choose a valid status."),
    analyzedAt: z.iso.datetime({ offset: true }),
    investmentScore: optionalScore,
    qualityScore: optionalScore,
    valuationScore: optionalScore,
    momentumScore: optionalScore,
    riskScore: optionalScore,
    recommendation: nullableText(160),
    summary: nullableText(5_000),
    pros: listText(20),
    risks: listText(20),
    price: z.coerce
      .number()
      .positive("Price must be greater than zero.")
      .max(1e12),
    currency: z.enum(["PLN", "USD"]),
    priceAsOf: z.iso.datetime({ offset: true }),
    fxUsdPln: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.coerce
        .number()
        .positive("FX must be greater than zero.")
        .max(100)
        .nullable(),
    ),
    sourceReference: nullableText(500),
    supersedesId: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.uuid().nullable(),
    ),
    thesisSummary: nullableText(5_000),
    bullCase: nullableText(5_000),
    baseCase: nullableText(5_000),
    bearCase: nullableText(5_000),
    catalysts: listText(20),
    killCriteria: listText(20),
  })
  .superRefine((value, context) => {
    if (value.currency === "PLN" && value.fxUsdPln !== null) {
      context.addIssue({
        code: "custom",
        path: ["fxUsdPln"],
        message: "USD/PLN is only valid for a USD stock.",
      });
    }
  });

export type ParsedMonitoringInput = z.output<typeof createMonitoringSchema>;
