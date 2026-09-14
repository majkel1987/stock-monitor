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

type CanonicalColumn =
  "Ticker" | "Date" | "Open" | "High" | "Low" | "Close" | "Volume";

const headerAliases: Record<string, CanonicalColumn> = {
  ticker: "Ticker",
  date: "Date",
  data: "Date",
  open: "Open",
  otwarcie: "Open",
  high: "High",
  najwyzszy: "High",
  maksimum: "High",
  low: "Low",
  najnizszy: "Low",
  minimum: "Low",
  close: "Close",
  zamkniecie: "Close",
  vol: "Volume",
  volume: "Volume",
  wolumen: "Volume",
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .replace(/[<>]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeDate(value: string) {
  const normalized = value.trim();

  if (/^\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
  }

  return normalized;
}

function splitCsvLine(line: string, delimiter: "," | ";") {
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
    } else if (character === delimiter && !quoted) {
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

export function parseStooqDailyCsv(
  payload: string,
  providerSymbol?: string,
): StooqDailyRow[] {
  const trimmed = payload.trim().replace(/^\uFEFF/, "");
  if (
    !trimmed ||
    /^\s*<(?:!doctype|html|head|body)\b/i.test(trimmed) ||
    /exceeded/i.test(trimmed)
  ) {
    throw new StooqError(
      "provider_invalid_response",
      "The file does not contain Stooq daily CSV data.",
    );
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const delimiter = (lines[0]?.includes(";") ? ";" : ",") as "," | ";";
  const header = lines[0] ? splitCsvLine(lines[0], delimiter) : [];
  const required = ["Date", "Open", "High", "Low", "Close", "Volume"];
  const canonicalHeader = header.map(
    (column) => headerAliases[normalizeHeader(column)] ?? null,
  );
  const containsTicker = canonicalHeader.includes("Ticker");

  if (containsTicker && !providerSymbol?.trim()) {
    throw new StooqError(
      "provider_invalid_response",
      "A ticker is required to import a Stooq bulk CSV file.",
    );
  }

  if (
    required.some(
      (column) => !canonicalHeader.includes(column as CanonicalColumn),
    )
  ) {
    throw new StooqError(
      "provider_invalid_response",
      "The Stooq CSV header is not supported.",
    );
  }

  const rows = lines.slice(1).flatMap((line) => {
    const values = splitCsvLine(line, delimiter);
    if (values.length !== header.length) {
      throw new StooqError(
        "provider_invalid_response",
        "The Stooq CSV contains an invalid daily price row.",
      );
    }
    const row = Object.fromEntries(
      canonicalHeader.flatMap((column, index) =>
        column ? [[column, values[index] ?? ""]] : [],
      ),
    );

    if (
      containsTicker &&
      (row.Ticker ?? "").trim().toUpperCase() !==
        providerSymbol?.trim().toUpperCase()
    ) {
      return [];
    }

    const parsed = stooqDailyRowSchema.safeParse({
      ...row,
      Date: normalizeDate(row.Date ?? ""),
    });
    if (!parsed.success) {
      throw new StooqError(
        "provider_invalid_response",
        "The Stooq CSV contains an invalid daily price row.",
      );
    }
    return [parsed.data];
  });

  if (rows.length === 0) {
    throw new StooqError(
      "provider_invalid_response",
      "The Stooq CSV contains no daily prices.",
    );
  }
  return rows;
}
