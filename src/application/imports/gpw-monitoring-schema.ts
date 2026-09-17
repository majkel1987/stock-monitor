import "server-only";

import { z } from "zod";

import canonicalSchema from "../../../docs/schemas/gpw-monitoring-import.schema.json";

export const GPW_IMPORT_MAX_BYTES = 1_000_000;
export const GPW_IMPORT_MAX_COMPANIES = 50;
const MAX_ARRAY_ITEMS = 100;
const MAX_TEXT_LENGTH = 20_000;
const MAX_DEPTH = 24;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type JsonSchema = {
  $ref?: string;
  anyOf?: JsonSchema[];
  not?: JsonSchema;
  type?: string | string[];
  const?: JsonValue;
  enum?: JsonValue[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean;
  items?: JsonSchema;
  uniqueItems?: boolean;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  minLength?: number;
  maxLength?: number;
  $defs?: Record<string, JsonSchema>;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type GpwImportCompany = {
  externalId: string;
  identity: {
    ticker: string;
    name: string;
    market: "GPW";
    currency: string;
    isin: string | null;
  };
  decision: {
    action: "BUY_GRADUALLY" | "WATCH" | "HOLD" | "REDUCE" | "AVOID";
    reason: string;
    watchReason: string | null;
  };
  classification: {
    status:
      | "BUY_CANDIDATE"
      | "WATCH"
      | "WAIT_FOR_CORRECTION"
      | "DEEP_DIVE"
      | "HOLD"
      | "REDUCE"
      | "AVOID"
      | "KILL_THE_THESIS";
    opportunityCategory: string | null;
  };
  score: {
    total: number | null;
    components: Record<string, number | null>;
  };
  marketData: {
    price: number | null;
    currency: string;
    asOf: string | null;
    source: string | null;
  };
  valuation: {
    summary: string | null;
    methods: JsonValue[];
    fairValueBase: number | null;
    attractiveEntryZone: {
      from: number | null;
      to: number | null;
      currency: string;
    };
    marginOfSafetySummary: string | null;
  };
  scenarios: Record<string, JsonValue>;
  expectedReturn: {
    horizonYears: number | null;
    baseTotalReturnPct: number | null;
    baseAnnualizedReturnPct: number | null;
    bullTotalReturnPct: number | null;
    bearDownsidePct: number | null;
    weightedExpectedReturnPct: number | null;
    returnDrivers: JsonValue[];
    asymmetryRatio: number | null;
    summary: string | null;
  };
  thesis: {
    summary: string | null;
    growthDrivers: string[];
    epsFcfGrowthDrivers: string[];
    catalysts: string[];
    pros: string[];
    risks: string[];
    killCriteria: JsonValue[];
  };
  positionPlan: {
    attractiveEntryZone: {
      from: number | null;
      to: number | null;
      currency: string;
    };
    tranches: Array<{
      number: number;
      triggerPrice: number | null;
      currency: string;
      condition: string;
      sizeGuidance: string;
    }>;
    summary: string | null;
  };
  monitoringPlan: {
    nextReviewDate: string | null;
    nextExpectedReportDate: string | null;
    nextReviewTriggers: string[];
    watchConditions: JsonValue[];
  };
  dataQuality: {
    confidence: "HIGH" | "MEDIUM" | "LOW";
    missingCriticalData: string[];
    conflictingData: string[];
    notes: string[];
  };
  [key: string]: JsonValue;
};

export type GpwImportPayload = {
  schemaVersion: "1.0";
  exportType: "gpw_opportunity_monitoring";
  externalId: string;
  generatedAt: string;
  analysisDate: string;
  market: "GPW";
  profile: Record<string, JsonValue>;
  marketRegime: Record<string, JsonValue>;
  scanSummary: Record<string, JsonValue> & { companiesExported: number };
  marketSources: JsonValue[];
  companies: GpwImportCompany[];
};

function pathLabel(path: Array<string | number>) {
  return path.length === 0
    ? "$"
    : path.reduce<string>(
        (result, part) =>
          typeof part === "number" ? `${result}[${part}]` : `${result}.${part}`,
        "$",
      );
}

function resolveReference(
  root: JsonSchema,
  reference: string,
): JsonSchema | null {
  if (!reference.startsWith("#/$defs/")) return null;
  const name = reference.slice("#/$defs/".length);
  return root.$defs?.[name] ?? null;
}

function matchesType(value: unknown, expected: string) {
  if (expected === "null") return value === null;
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  if (expected === "integer")
    return typeof value === "number" && Number.isInteger(value);
  if (expected === "number")
    return typeof value === "number" && Number.isFinite(value);
  return typeof value === expected;
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function validDateTime(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) && !Number.isNaN(Date.parse(value))
  );
}

function validUri(value: string) {
  try {
    return new URL(value).protocol.length > 1;
  } catch {
    return false;
  }
}

function validateNode(
  schema: JsonSchema,
  value: unknown,
  root: JsonSchema,
  path: Array<string | number>,
  issues: ValidationIssue[],
) {
  if (schema.$ref) {
    const resolved = resolveReference(root, schema.$ref);
    if (!resolved)
      issues.push({
        path: pathLabel(path),
        message: `Unsupported schema reference ${schema.$ref}.`,
      });
    else validateNode(resolved, value, root, path, issues);
    return;
  }

  if (schema.anyOf) {
    const valid = schema.anyOf.some((candidate) => {
      const candidateIssues: ValidationIssue[] = [];
      validateNode(candidate, value, root, path, candidateIssues);
      return candidateIssues.length === 0;
    });
    if (!valid)
      issues.push({
        path: pathLabel(path),
        message: "Value does not match any allowed shape.",
      });
    return;
  }

  if (schema.not) {
    const forbiddenIssues: ValidationIssue[] = [];
    validateNode(schema.not, value, root, path, forbiddenIssues);
    if (forbiddenIssues.length === 0)
      issues.push({
        path: pathLabel(path),
        message: "Value matches a forbidden shape.",
      });
  }

  if (
    schema.const !== undefined &&
    stableValue(value) !== stableValue(schema.const)
  ) {
    issues.push({
      path: pathLabel(path),
      message: `Expected ${JSON.stringify(schema.const)}.`,
    });
    return;
  }

  if (
    schema.enum &&
    !schema.enum.some((item) => stableValue(item) === stableValue(value))
  ) {
    issues.push({
      path: pathLabel(path),
      message: "Value is not in the allowed enum.",
    });
    return;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      issues.push({
        path: pathLabel(path),
        message: `Expected ${types.join(" or ")}.`,
      });
      return;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      issues.push({
        path: pathLabel(path),
        message: `Must contain at least ${schema.minLength} characters.`,
      });
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      issues.push({
        path: pathLabel(path),
        message: `Must contain at most ${schema.maxLength} characters.`,
      });
    if (schema.pattern && !new RegExp(schema.pattern).test(value))
      issues.push({
        path: pathLabel(path),
        message: "Value does not match the required pattern.",
      });
    if (schema.format === "date" && !validDate(value))
      issues.push({
        path: pathLabel(path),
        message: "Expected a valid ISO date.",
      });
    if (schema.format === "date-time" && !validDateTime(value))
      issues.push({
        path: pathLabel(path),
        message: "Expected a valid RFC 3339 date-time.",
      });
    if (schema.format === "uri" && !validUri(value))
      issues.push({
        path: pathLabel(path),
        message: "Expected an absolute URI.",
      });
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum)
      issues.push({
        path: pathLabel(path),
        message: `Must be at least ${schema.minimum}.`,
      });
    if (schema.maximum !== undefined && value > schema.maximum)
      issues.push({
        path: pathLabel(path),
        message: `Must be at most ${schema.maximum}.`,
      });
    if (
      schema.exclusiveMinimum !== undefined &&
      value <= schema.exclusiveMinimum
    )
      issues.push({
        path: pathLabel(path),
        message: `Must be greater than ${schema.exclusiveMinimum}.`,
      });
  }

  if (Array.isArray(value)) {
    if (schema.uniqueItems) {
      const unique = new Set(value.map(stableValue));
      if (unique.size !== value.length)
        issues.push({
          path: pathLabel(path),
          message: "Array items must be unique.",
        });
    }
    if (schema.items)
      value.forEach((item, index) =>
        validateNode(schema.items!, item, root, [...path, index], issues),
      );
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (!(required in record))
        issues.push({
          path: pathLabel([...path, required]),
          message: "Required field is missing.",
        });
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(record)) {
        if (!(key in schema.properties))
          issues.push({
            path: pathLabel([...path, key]),
            message: "Unknown field is not allowed.",
          });
      }
    }
    for (const [key, propertySchema] of Object.entries(
      schema.properties ?? {},
    )) {
      if (key in record)
        validateNode(propertySchema, record[key], root, [...path, key], issues);
    }
  }
}

function validateSafetyLimits(
  value: unknown,
  issues: ValidationIssue[],
  path: Array<string | number> = [],
  depth = 0,
) {
  if (depth > MAX_DEPTH) {
    issues.push({
      path: pathLabel(path),
      message: `Maximum nesting depth is ${MAX_DEPTH}.`,
    });
    return;
  }
  if (typeof value === "string" && value.length > MAX_TEXT_LENGTH) {
    issues.push({
      path: pathLabel(path),
      message: `Text exceeds the ${MAX_TEXT_LENGTH} character safety limit.`,
    });
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS)
      issues.push({
        path: pathLabel(path),
        message: `Array exceeds the ${MAX_ARRAY_ITEMS} item safety limit.`,
      });
    value.forEach((item, index) =>
      validateSafetyLimits(item, issues, [...path, index], depth + 1),
    );
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value))
      validateSafetyLimits(item, issues, [...path, key], depth + 1);
  }
}

function semanticIssues(payload: GpwImportPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (payload.companies.length > GPW_IMPORT_MAX_COMPANIES)
    issues.push({
      path: "$.companies",
      message: `At most ${GPW_IMPORT_MAX_COMPANIES} companies can be imported at once.`,
    });
  if (payload.scanSummary.companiesExported !== payload.companies.length)
    issues.push({
      path: "$.scanSummary.companiesExported",
      message: "Must equal companies.length.",
    });

  const externalIds = new Set<string>();
  payload.companies.forEach((company, index) => {
    if (externalIds.has(company.externalId))
      issues.push({
        path: `$.companies[${index}].externalId`,
        message: "Company externalId must be unique within the batch.",
      });
    externalIds.add(company.externalId);
    const components = Object.values(company.score.components);
    if (company.score.total !== null) {
      if (components.some((component) => component === null))
        issues.push({
          path: `$.companies[${index}].score.components`,
          message: "All score components are required when total is present.",
        });
      else if (
        components.reduce<number>(
          (sum, component) => sum + (component ?? 0),
          0,
        ) !== company.score.total
      )
        issues.push({
          path: `$.companies[${index}].score.total`,
          message: "Score component sum must equal total.",
        });
    }
    if (company.marketData.price !== null && company.marketData.price <= 0)
      issues.push({
        path: `$.companies[${index}].marketData.price`,
        message: "Analysis price must be greater than zero when present.",
      });
    if (
      (company.marketData.price === null) !==
      (company.marketData.asOf === null)
    )
      issues.push({
        path: `$.companies[${index}].marketData`,
        message:
          "Analysis price and asOf must either both be present or both be null.",
      });
    if (company.identity.currency !== company.marketData.currency)
      issues.push({
        path: `$.companies[${index}].marketData.currency`,
        message: "Market-data currency must match the instrument currency.",
      });
  });
  return issues;
}

function companySemanticIssues(
  company: GpwImportCompany,
  index: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const prefix = `$.companies[${index}]`;
  const components = Object.values(company.score.components);
  if (company.score.total !== null) {
    if (components.some((component) => component === null)) {
      issues.push({
        path: `${prefix}.score.components`,
        message: "All score components are required when total is present.",
      });
    } else if (
      components.reduce<number>(
        (sum, component) => sum + (component ?? 0),
        0,
      ) !== company.score.total
    ) {
      issues.push({
        path: `${prefix}.score.total`,
        message: "Score component sum must equal total.",
      });
    }
  }
  if (company.marketData.price !== null && company.marketData.price <= 0) {
    issues.push({
      path: `${prefix}.marketData.price`,
      message: "Analysis price must be greater than zero when present.",
    });
  }
  if (
    (company.marketData.price === null) !==
    (company.marketData.asOf === null)
  ) {
    issues.push({
      path: `${prefix}.marketData`,
      message:
        "Analysis price and asOf must either both be present or both be null.",
    });
  }
  if (company.identity.currency !== company.marketData.currency) {
    issues.push({
      path: `${prefix}.marketData.currency`,
      message: "Market-data currency must match the instrument currency.",
    });
  }
  return issues;
}

export type ParsedDraftItem = {
  externalId: string;
  company: GpwImportCompany | null;
  rawCompany: Record<string, JsonValue>;
  issues: ValidationIssue[];
};

export type ParsedGpwImportDraft = Omit<GpwImportPayload, "companies"> & {
  companies: ParsedDraftItem[];
  rawPayload: Record<string, JsonValue>;
};

export function parseGpwMonitoringImportDraft(
  payload: string,
):
  | { success: true; data: ParsedGpwImportDraft }
  | {
      success: false;
      issues: ValidationIssue[];
      category: "payload_too_large" | "invalid_json" | "invalid_schema";
    } {
  if (Buffer.byteLength(payload, "utf8") > GPW_IMPORT_MAX_BYTES) {
    return {
      success: false,
      category: "payload_too_large",
      issues: [
        {
          path: "$",
          message: `Payload exceeds ${GPW_IMPORT_MAX_BYTES} bytes.`,
        },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return {
      success: false,
      category: "invalid_json",
      issues: [{ path: "$", message: "File is not valid JSON." }],
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      success: false,
      category: "invalid_schema",
      issues: [{ path: "$", message: "Expected an object payload." }],
    };
  }

  const record = parsed as Record<string, JsonValue>;
  const companiesValue = record.companies;
  const topLevelSchema: JsonSchema = {
    ...canonicalRoot,
    properties: {
      ...canonicalRoot.properties,
      companies: {
        ...(canonicalRoot.properties?.companies ?? {}),
        items: {},
      },
    },
  };
  const topLevelIssues: ValidationIssue[] = [];
  validateNode(topLevelSchema, parsed, canonicalRoot, [], topLevelIssues);
  validateSafetyLimits(parsed, topLevelIssues);
  if (!Array.isArray(companiesValue)) {
    topLevelIssues.push({ path: "$.companies", message: "Expected an array." });
  } else if (companiesValue.length > GPW_IMPORT_MAX_COMPANIES) {
    topLevelIssues.push({
      path: "$.companies",
      message: `At most ${GPW_IMPORT_MAX_COMPANIES} companies can be imported at once.`,
    });
  }
  const scanSummary = record.scanSummary;
  if (
    Array.isArray(companiesValue) &&
    typeof scanSummary === "object" &&
    scanSummary !== null &&
    !Array.isArray(scanSummary) &&
    scanSummary.companiesExported !== companiesValue.length
  ) {
    topLevelIssues.push({
      path: "$.scanSummary.companiesExported",
      message: "Must equal companies.length.",
    });
  }
  if (topLevelIssues.length > 0) {
    return {
      success: false,
      category: "invalid_schema",
      issues: topLevelIssues,
    };
  }

  const companySchema = canonicalRoot.$defs?.company;
  if (!companySchema || !Array.isArray(companiesValue)) {
    return {
      success: false,
      category: "invalid_schema",
      issues: [
        {
          path: "$.companies",
          message: "Canonical company schema is unavailable.",
        },
      ],
    };
  }

  const seenExternalIds = new Set<string>();
  const companies = companiesValue.map((rawCompany, index): ParsedDraftItem => {
    const companyIssues: ValidationIssue[] = [];
    validateNode(
      companySchema,
      rawCompany,
      canonicalRoot,
      ["companies", index],
      companyIssues,
    );
    const companyRecord =
      typeof rawCompany === "object" &&
      rawCompany !== null &&
      !Array.isArray(rawCompany)
        ? (rawCompany as Record<string, JsonValue>)
        : {};
    const externalId =
      typeof companyRecord.externalId === "string"
        ? companyRecord.externalId
        : `invalid-item-${index + 1}`;
    if (seenExternalIds.has(externalId)) {
      companyIssues.push({
        path: `$.companies[${index}].externalId`,
        message: "Company externalId must be unique within the batch.",
      });
    }
    seenExternalIds.add(externalId);
    if (companyIssues.length === 0)
      companyIssues.push(
        ...companySemanticIssues(companyRecord as GpwImportCompany, index),
      );
    return {
      externalId,
      company:
        companyIssues.length === 0 ? (companyRecord as GpwImportCompany) : null,
      rawCompany: companyRecord,
      issues: companyIssues,
    };
  });

  return {
    success: true,
    data: {
      schemaVersion: record.schemaVersion as "1.0",
      exportType: record.exportType as "gpw_opportunity_monitoring",
      externalId: record.externalId as string,
      generatedAt: record.generatedAt as string,
      analysisDate: record.analysisDate as string,
      market: "GPW",
      profile: record.profile as Record<string, JsonValue>,
      marketRegime: record.marketRegime as Record<string, JsonValue>,
      scanSummary: record.scanSummary as GpwImportPayload["scanSummary"],
      marketSources: record.marketSources as JsonValue[],
      companies,
      rawPayload: record,
    },
  };
}

const canonicalRoot = canonicalSchema as JsonSchema;

export const gpwMonitoringImportSchema = z
  .unknown()
  .superRefine((value, context) => {
    const issues: ValidationIssue[] = [];
    validateNode(canonicalRoot, value, canonicalRoot, [], issues);
    validateSafetyLimits(value, issues);
    if (issues.length === 0)
      issues.push(...semanticIssues(value as GpwImportPayload));
    for (const issue of issues)
      context.addIssue({
        code: "custom",
        path: [issue.path],
        message: issue.message,
      });
  });

export function parseGpwMonitoringImport(
  payload: string,
):
  | { success: true; data: GpwImportPayload }
  | {
      success: false;
      issues: ValidationIssue[];
      category: "payload_too_large" | "invalid_json" | "invalid_schema";
    } {
  if (Buffer.byteLength(payload, "utf8") > GPW_IMPORT_MAX_BYTES) {
    return {
      success: false,
      category: "payload_too_large",
      issues: [
        {
          path: "$",
          message: `Payload exceeds ${GPW_IMPORT_MAX_BYTES} bytes.`,
        },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return {
      success: false,
      category: "invalid_json",
      issues: [{ path: "$", message: "File is not valid JSON." }],
    };
  }

  const result = gpwMonitoringImportSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      category: "invalid_schema",
      issues: result.error.issues.map((issue) => ({
        path: String(issue.path[0] ?? "$"),
        message: issue.message,
      })),
    };
  }

  return { success: true, data: parsed as GpwImportPayload };
}
