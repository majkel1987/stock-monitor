import { z } from "zod";

import { StooqError } from "./stooq-errors";

const positiveDecimal = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/)
  .refine((value) => Number(value) > 0);
const nonNegativeDecimal = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
    );
  });

const stooqDailyRowSchema = z
  .object({
    Date: date,
    Open: positiveDecimal,
    High: positiveDecimal,
    Low: positiveDecimal,
    Close: positiveDecimal,
    Volume: nonNegativeDecimal,
  })
  .refine((row) => Number(row.High) >= Number(row.Low));

export type StooqDailyRow = z.infer<typeof stooqDailyRowSchema>;

function splitCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted)
    throw new StooqError(
      "provider_invalid_response",
      "Stooq CSV is malformed.",
    );
  values.push(value);
  return values;
}

export function parseStooqDailyCsv(payload: string): StooqDailyRow[] {
  const trimmed = payload.trim().replace(/^\uFEFF/, "");
  if (!trimmed || /^\s*</.test(trimmed) || /exceeded/i.test(trimmed)) {
    throw new StooqError(
      "provider_invalid_response",
      "The file does not contain Stooq daily CSV data.",
    );
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const header = lines[0] ? splitCsvLine(lines[0]) : [];
  const required = ["Date", "Open", "High", "Low", "Close", "Volume"];
  if (
    header.length !== required.length ||
    required.some((column, index) => header[index] !== column)
  ) {
    throw new StooqError(
      "provider_invalid_response",
      "The Stooq CSV header is not supported.",
    );
  }

  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    if (values.length !== header.length) {
      throw new StooqError(
        "provider_invalid_response",
        "The Stooq CSV contains an invalid daily price row.",
      );
    }
    const parsed = stooqDailyRowSchema.safeParse(
      Object.fromEntries(
        header.map((column, index) => [column, values[index] ?? ""]),
      ),
    );
    if (!parsed.success) {
      throw new StooqError(
        "provider_invalid_response",
        "The Stooq CSV contains an invalid daily price row.",
      );
    }
    return parsed.data;
  });

  if (rows.length === 0) {
    throw new StooqError(
      "provider_invalid_response",
      "The Stooq CSV contains no daily prices.",
    );
  }
  return rows;
}
