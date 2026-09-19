import "server-only";

import { z } from "zod";

import type { JsonValue, ValidationIssue } from "./gpw-monitoring-schema";

export const USA_IMPORT_MAX_BYTES = 1_000_000;
export const USA_IMPORT_MAX_COMPANIES = 50;

const MAX_ARRAY_ITEMS = 100;
const MAX_TEXT_LENGTH = 20_000;
const MAX_DEPTH = 24;

const text = z.string().min(1).max(MAX_TEXT_LENGTH);
const nullableText = z.string().max(MAX_TEXT_LENGTH).nullable().optional();
const nullableNumber = z.number().finite().nullable().optional();
const date = z.string().refine(validDate, "Expected a valid ISO date.");
const dateTime = z
  .string()
  .refine(validDateTime, "Expected a valid RFC 3339 date-time.");
const usd = z.literal("USD");

const sourceSchema = z.looseObject({
  type: text.optional(),
  title: text.optional(),
  publisher: text.optional(),
  publishedAt: date.nullable().optional(),
  url: z.url().nullable().optional(),
  accessedAt: dateTime.nullable().optional(),
});

const priceZoneSchema = z.looseObject({
  from: nullableNumber,
  to: nullableNumber,
  currency: usd,
  fundamentalCondition: nullableText,
  expectedAnnualizedReturnPctUsd: nullableNumber,
  note: nullableText,
});

const scenarioSchema = z.looseObject({
  fairValue: nullableNumber,
  currency: usd,
  totalReturnPct: nullableNumber,
  annualizedReturnPct: nullableNumber,
  probabilityPct: nullableNumber,
  revenueCagrPct: nullableNumber,
  targetOperatingMarginPct: nullableNumber,
  targetFcfMarginPct: nullableNumber,
});

const usaCompanySchema = z.looseObject({
  externalId: text.max(160).optional(),
  identity: z.looseObject({
    ticker: z.string().regex(/^[A-Z0-9][A-Z0-9.-]{0,19}$/),
    name: text,
    legalName: nullableText,
    market: z.literal("USA"),
    exchange: text,
    currency: usd,
    cik: z
      .string()
      .regex(/^\d{10}$/)
      .nullable()
      .optional(),
    isin: z
      .string()
      .regex(/^[A-Z0-9]{12}$/)
      .nullable()
      .optional(),
  }),
  decision: z
    .looseObject({
      action: z
        .enum(["BUY_GRADUALLY", "WATCH", "HOLD", "REDUCE", "AVOID"])
        .optional(),
      reason: nullableText,
      watchReason: nullableText,
    })
    .nullable()
    .optional(),
  classification: z
    .looseObject({
      status: z
        .enum([
          "BUY_CANDIDATE",
          "WATCH",
          "WAIT_FOR_CORRECTION",
          "DEEP_DIVE",
          "HOLD",
          "REDUCE",
          "AVOID",
          "KILL_THE_THESIS",
        ])
        .optional(),
      opportunityCategory: nullableText,
    })
    .nullable()
    .optional(),
  score: z
    .looseObject({
      total: z.number().int().min(0).max(100).nullable().optional(),
      components: z
        .record(z.string(), z.number().min(0).max(100).nullable())
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  marketData: z
    .looseObject({
      price: z.number().positive().nullable().optional(),
      currency: usd,
      asOf: dateTime.nullable().optional(),
      source: nullableText,
      marketCapUsd: nullableNumber,
      averageDailyDollarVolumeUsd: nullableNumber,
    })
    .nullable()
    .optional(),
  valuation: z
    .looseObject({
      summary: nullableText,
      methods: z.array(z.json()).max(MAX_ARRAY_ITEMS).nullable().optional(),
      fairValueBase: nullableNumber,
      attractiveEntryZone: priceZoneSchema.nullable().optional(),
      marginOfSafetySummary: nullableText,
      reverseDcf: z.looseObject({}).nullable().optional(),
      entryZones: z
        .looseObject({
          starter: priceZoneSchema.nullable().optional(),
          attractive: priceZoneSchema.nullable().optional(),
          highMarginOfSafety: priceZoneSchema.nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  scenarios: z
    .looseObject({
      bear: scenarioSchema.nullable().optional(),
      base: scenarioSchema.nullable().optional(),
      bull: scenarioSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  expectedReturn: z
    .looseObject({
      horizonYears: nullableNumber,
      baseTotalReturnPct: nullableNumber,
      baseAnnualizedReturnPct: nullableNumber,
      bullTotalReturnPct: nullableNumber,
      bearDownsidePct: nullableNumber,
      weightedExpectedReturnPct: nullableNumber,
      asymmetryRatio: nullableNumber,
      baseAnnualizedReturnPctPln: nullableNumber,
      weightedExpectedReturnPctPln: nullableNumber,
      fxContributionAnnualizedPct: nullableNumber,
      benchmarkComparison: z
        .array(z.json())
        .max(MAX_ARRAY_ITEMS)
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  thesis: z
    .looseObject({
      summary: nullableText,
      growthDrivers: z.array(text).max(MAX_ARRAY_ITEMS).nullable().optional(),
      epsFcfGrowthDrivers: z
        .array(text)
        .max(MAX_ARRAY_ITEMS)
        .nullable()
        .optional(),
      catalysts: z.array(text).max(MAX_ARRAY_ITEMS).nullable().optional(),
      pros: z.array(text).max(MAX_ARRAY_ITEMS).nullable().optional(),
      risks: z.array(text).max(MAX_ARRAY_ITEMS).nullable().optional(),
      killCriteria: z
        .array(z.json())
        .max(MAX_ARRAY_ITEMS)
        .nullable()
        .optional(),
      whyMarketMayBeWrong: nullableText,
      keyKpis: z.array(text).max(MAX_ARRAY_ITEMS).nullable().optional(),
    })
    .nullable()
    .optional(),
  positionPlan: z
    .looseObject({
      attractiveEntryZone: priceZoneSchema.nullable().optional(),
      tranches: z
        .array(
          z.looseObject({
            number: z.number().int().positive(),
            triggerPrice: z.number().positive().nullable(),
            currency: usd,
            condition: text,
            sizeGuidance: text,
          }),
        )
        .max(MAX_ARRAY_ITEMS)
        .nullable()
        .optional(),
      summary: nullableText,
      entryZones: z.looseObject({}).nullable().optional(),
    })
    .nullable()
    .optional(),
  monitoringPlan: z
    .looseObject({
      nextReviewDate: date.nullable().optional(),
      nextExpectedReportDate: date.nullable().optional(),
      nextReviewTriggers: z
        .array(text)
        .max(MAX_ARRAY_ITEMS)
        .nullable()
        .optional(),
      watchConditions: z
        .array(z.json())
        .max(MAX_ARRAY_ITEMS)
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  sources: z.array(sourceSchema).max(MAX_ARRAY_ITEMS).nullable().optional(),
  dataQuality: z
    .looseObject({
      confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).nullable().optional(),
      missingCriticalData: z
        .array(text)
        .max(MAX_ARRAY_ITEMS)
        .nullable()
        .optional(),
      conflictingData: z.array(text).max(MAX_ARRAY_ITEMS).nullable().optional(),
      notes: z.array(text).max(MAX_ARRAY_ITEMS).nullable().optional(),
    })
    .nullable()
    .optional(),
  screeningAssessment: z.json().nullable().optional(),
  narrativeToNumbers: z.json().nullable().optional(),
  businessQuality: z.json().nullable().optional(),
  financialQuality: z.json().nullable().optional(),
  managementAndOwnership: z.json().nullable().optional(),
  dividend: z.json().nullable().optional(),
  timing: z.json().nullable().optional(),
  supplyAnomaly: z.json().nullable().optional(),
  smallMidCapRisk: z.json().nullable().optional(),
  riskAssessment: z.json().nullable().optional(),
  dilutionAndBuybacks: z.json().nullable().optional(),
});

const envelopeSchema = z.looseObject({
  schemaVersion: z.literal("1.0"),
  exportType: z.literal("usa_opportunity_monitoring"),
  externalId: text.max(160).optional(),
  generatedAt: dateTime.optional(),
  analysisDate: date,
  market: z.literal("USA"),
  profile: z.looseObject({}).optional(),
  marketRegime: z.looseObject({}).optional(),
  scanSummary: z
    .looseObject({
      companiesExported: z.number().int().min(0).optional(),
    })
    .optional(),
  marketSources: z.array(sourceSchema).max(MAX_ARRAY_ITEMS).optional(),
  companies: z.array(z.unknown()).max(USA_IMPORT_MAX_COMPANIES),
  fxContext: z.looseObject({}).optional(),
});

type UsaRawCompany = z.infer<typeof usaCompanySchema>;

export type UsaImportCompany = {
  externalId: string;
  identity: {
    ticker: string;
    name: string;
    legalName: string | null;
    market: "USA";
    exchange: string;
    currency: "USD";
    cik: string | null;
    isin: string | null;
  };
  decision: {
    action: "BUY_GRADUALLY" | "WATCH" | "HOLD" | "REDUCE" | "AVOID";
    reason: string | null;
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
    price: number;
    currency: "USD";
    asOf: string;
    source: string | null;
    marketCapUsd: number | null;
    averageDailyDollarVolumeUsd: number | null;
  };
  valuation: {
    summary: string | null;
    methods: JsonValue[];
    fairValueBase: number | null;
    attractiveEntryZone: {
      from: number | null;
      to: number | null;
      currency: "USD";
    };
    marginOfSafetySummary: string | null;
    reverseDcf?: JsonValue;
    entryZones?: JsonValue;
  };
  scenarios: Record<string, JsonValue>;
  expectedReturn: {
    horizonYears: number | null;
    baseTotalReturnPct: number | null;
    baseAnnualizedReturnPct: number | null;
    bullTotalReturnPct: number | null;
    bearDownsidePct: number | null;
    weightedExpectedReturnPct: number | null;
    asymmetryRatio: number | null;
    baseAnnualizedReturnPctPln?: number | null;
    weightedExpectedReturnPctPln?: number | null;
    fxContributionAnnualizedPct?: number | null;
    benchmarkComparison?: JsonValue[];
  };
  thesis: {
    summary: string | null;
    growthDrivers: string[];
    epsFcfGrowthDrivers: string[];
    catalysts: string[];
    pros: string[];
    risks: string[];
    killCriteria: JsonValue[];
    whyMarketMayBeWrong?: string | null;
    keyKpis?: string[];
  };
  positionPlan: {
    attractiveEntryZone: {
      from: number | null;
      to: number | null;
      currency: "USD";
    };
    tranches: Array<{
      number: number;
      triggerPrice: number | null;
      currency: "USD";
      condition: string;
      sizeGuidance: string;
    }>;
    summary: string | null;
    entryZones?: JsonValue;
  };
  monitoringPlan: {
    nextReviewDate: string | null;
    nextExpectedReportDate: string | null;
    nextReviewTriggers: string[];
    watchConditions: JsonValue[];
  };
  dataQuality: {
    confidence: "HIGH" | "MEDIUM" | "LOW" | null;
    missingCriticalData: string[];
    conflictingData: string[];
    notes: string[];
  };
  sources?: JsonValue[];
  screeningAssessment?: JsonValue;
  narrativeToNumbers?: JsonValue;
  businessQuality?: JsonValue;
  financialQuality?: JsonValue;
  managementAndOwnership?: JsonValue;
  dividend?: JsonValue;
  timing?: JsonValue;
  supplyAnomaly?: JsonValue;
  smallMidCapRisk?: JsonValue;
  riskAssessment?: JsonValue;
  dilutionAndBuybacks?: JsonValue;
  [key: string]: unknown;
};

export type UsaImportPayload = {
  schemaVersion: "1.0";
  exportType: "usa_opportunity_monitoring";
  externalId?: string;
  generatedAt?: string;
  analysisDate: string;
  market: "USA";
  companies: UsaRawCompany[];
  [key: string]: unknown;
};

export type ParsedUsaDraftItem = {
  externalId: string;
  company: UsaImportCompany | null;
  rawCompany: Record<string, JsonValue>;
  issues: ValidationIssue[];
};

export type ParsedUsaImportDraft = {
  schemaVersion: "1.0";
  exportType: "usa_opportunity_monitoring";
  externalId: string | null;
  generatedAt: string | null;
  analysisDate: string;
  market: "USA";
  companies: ParsedUsaDraftItem[];
  rawPayload: Record<string, JsonValue>;
};

type ParseFailure = {
  success: false;
  issues: ValidationIssue[];
  category: "payload_too_large" | "invalid_json" | "invalid_schema";
};

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function validDateTime(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) && !Number.isNaN(Date.parse(value))
  );
}

function pathLabel(path: Array<string | number>) {
  let result = "$";
  for (const part of path) {
    result += typeof part === "number" ? `[${part}]` : `.${part}`;
  }
  return result;
}

function zodIssues(
  issues: z.core.$ZodIssue[],
  prefix: PropertyKey[] = [],
): ValidationIssue[] {
  return issues.map((issue) => ({
    path: pathLabel(
      [...prefix, ...issue.path].map((part) =>
        typeof part === "number" ? part : String(part),
      ),
    ),
    message: issue.message,
  }));
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
    if (value.length > MAX_ARRAY_ITEMS) {
      issues.push({
        path: pathLabel(path),
        message: `Array exceeds the ${MAX_ARRAY_ITEMS} item safety limit.`,
      });
    }
    value.forEach((item, index) =>
      validateSafetyLimits(item, issues, [...path, index], depth + 1),
    );
  } else if (typeof value === "object" && value !== null) {
    Object.entries(value).forEach(([key, item]) =>
      validateSafetyLimits(item, issues, [...path, key], depth + 1),
    );
  }
}

function parseJsonPayload(
  payload: string,
): { success: true; value: Record<string, JsonValue> } | ParseFailure {
  if (Buffer.byteLength(payload, "utf8") > USA_IMPORT_MAX_BYTES) {
    return {
      success: false,
      category: "payload_too_large",
      issues: [
        {
          path: "$",
          message: `Payload exceeds ${USA_IMPORT_MAX_BYTES} bytes.`,
        },
      ],
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    return {
      success: false,
      category: "invalid_json",
      issues: [{ path: "$", message: "File is not valid JSON." }],
    };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      success: false,
      category: "invalid_schema",
      issues: [{ path: "$", message: "Expected an object payload." }],
    };
  }
  return { success: true, value: value as Record<string, JsonValue> };
}

function normalizeCompany(
  company: UsaRawCompany,
  externalId: string,
): UsaImportCompany | null {
  if (
    !company.decision?.action ||
    !company.classification?.status ||
    company.marketData?.price === null ||
    company.marketData?.price === undefined ||
    !company.marketData.asOf
  ) {
    return null;
  }
  const valuationZone = company.valuation?.attractiveEntryZone;
  const positionZone = company.positionPlan?.attractiveEntryZone;
  return {
    ...(company as Record<string, unknown>),
    externalId,
    identity: {
      ...company.identity,
      legalName: company.identity.legalName ?? null,
      cik: company.identity.cik ?? null,
      isin: company.identity.isin ?? null,
    },
    decision: {
      ...company.decision,
      action: company.decision.action,
      reason: company.decision.reason ?? null,
      watchReason: company.decision.watchReason ?? null,
    },
    classification: {
      ...company.classification,
      status: company.classification.status,
      opportunityCategory: company.classification.opportunityCategory ?? null,
    },
    score: {
      ...(company.score ?? {}),
      total: company.score?.total ?? null,
      components: company.score?.components ?? {},
    },
    marketData: {
      ...company.marketData,
      price: company.marketData.price,
      currency: "USD",
      asOf: company.marketData.asOf,
      source: company.marketData.source ?? null,
      marketCapUsd: company.marketData.marketCapUsd ?? null,
      averageDailyDollarVolumeUsd:
        company.marketData.averageDailyDollarVolumeUsd ?? null,
    },
    valuation: {
      ...(company.valuation ?? {}),
      summary: company.valuation?.summary ?? null,
      methods: (company.valuation?.methods ?? []) as JsonValue[],
      fairValueBase: company.valuation?.fairValueBase ?? null,
      attractiveEntryZone: {
        from: valuationZone?.from ?? null,
        to: valuationZone?.to ?? null,
        currency: "USD",
      },
      marginOfSafetySummary: company.valuation?.marginOfSafetySummary ?? null,
    } as UsaImportCompany["valuation"],
    scenarios: (company.scenarios ?? {}) as Record<string, JsonValue>,
    expectedReturn: {
      ...(company.expectedReturn ?? {}),
      horizonYears: company.expectedReturn?.horizonYears ?? null,
      baseTotalReturnPct: company.expectedReturn?.baseTotalReturnPct ?? null,
      baseAnnualizedReturnPct:
        company.expectedReturn?.baseAnnualizedReturnPct ?? null,
      bullTotalReturnPct: company.expectedReturn?.bullTotalReturnPct ?? null,
      bearDownsidePct: company.expectedReturn?.bearDownsidePct ?? null,
      weightedExpectedReturnPct:
        company.expectedReturn?.weightedExpectedReturnPct ?? null,
      asymmetryRatio: company.expectedReturn?.asymmetryRatio ?? null,
    } as UsaImportCompany["expectedReturn"],
    thesis: {
      ...(company.thesis ?? {}),
      summary: company.thesis?.summary ?? null,
      growthDrivers: company.thesis?.growthDrivers ?? [],
      epsFcfGrowthDrivers: company.thesis?.epsFcfGrowthDrivers ?? [],
      catalysts: company.thesis?.catalysts ?? [],
      pros: company.thesis?.pros ?? [],
      risks: company.thesis?.risks ?? [],
      killCriteria: (company.thesis?.killCriteria ?? []) as JsonValue[],
    } as UsaImportCompany["thesis"],
    positionPlan: {
      ...(company.positionPlan ?? {}),
      attractiveEntryZone: {
        from: positionZone?.from ?? null,
        to: positionZone?.to ?? null,
        currency: "USD",
      },
      tranches: company.positionPlan?.tranches ?? [],
      summary: company.positionPlan?.summary ?? null,
      entryZones: company.positionPlan?.entryZones as JsonValue | undefined,
    } as UsaImportCompany["positionPlan"],
    monitoringPlan: {
      ...(company.monitoringPlan ?? {}),
      nextReviewDate: company.monitoringPlan?.nextReviewDate ?? null,
      nextExpectedReportDate:
        company.monitoringPlan?.nextExpectedReportDate ?? null,
      nextReviewTriggers: company.monitoringPlan?.nextReviewTriggers ?? [],
      watchConditions: (company.monitoringPlan?.watchConditions ??
        []) as JsonValue[],
    },
    dataQuality: {
      ...(company.dataQuality ?? {}),
      confidence: company.dataQuality?.confidence ?? null,
      missingCriticalData: company.dataQuality?.missingCriticalData ?? [],
      conflictingData: company.dataQuality?.conflictingData ?? [],
      notes: company.dataQuality?.notes ?? [],
    },
    sources: (company.sources ?? []) as JsonValue[],
  };
}

function commitIssues(
  company: UsaRawCompany,
  index: number,
): ValidationIssue[] {
  const prefix = `$.companies[${index}]`;
  const issues: ValidationIssue[] = [];
  if (!company.decision?.action)
    issues.push({
      path: `${prefix}.decision.action`,
      message: "Required to commit an analysis.",
    });
  if (!company.classification?.status)
    issues.push({
      path: `${prefix}.classification.status`,
      message: "Required to resolve a watchlist status.",
    });
  if (
    company.marketData?.price === null ||
    company.marketData?.price === undefined
  )
    issues.push({
      path: `${prefix}.marketData.price`,
      message: "Required to create an immutable analysis snapshot.",
    });
  if (!company.marketData?.asOf)
    issues.push({
      path: `${prefix}.marketData.asOf`,
      message: "Required to create an immutable analysis snapshot.",
    });
  return issues;
}

export function parseUsaMonitoringImportDraft(
  payload: string,
): { success: true; data: ParsedUsaImportDraft } | ParseFailure {
  const json = parseJsonPayload(payload);
  if (!json.success) return json;
  const envelope = envelopeSchema.safeParse(json.value);
  const issues = envelope.success ? [] : zodIssues(envelope.error.issues);
  validateSafetyLimits(json.value, issues);
  if (envelope.success) {
    const exported = envelope.data.scanSummary?.companiesExported;
    if (exported !== undefined && exported !== envelope.data.companies.length) {
      issues.push({
        path: "$.scanSummary.companiesExported",
        message: "Must equal companies.length when present.",
      });
    }
  }
  if (!envelope.success || issues.length > 0) {
    return { success: false, category: "invalid_schema", issues };
  }

  const seen = new Set<string>();
  const batchSeed =
    envelope.data.externalId ?? `usa-import-${envelope.data.analysisDate}`;
  const companies = envelope.data.companies.map((raw, index) => {
    const parsed = usaCompanySchema.safeParse(raw);
    const rawCompany =
      typeof raw === "object" && raw !== null && !Array.isArray(raw)
        ? (raw as Record<string, JsonValue>)
        : {};
    const companyIssues = parsed.success
      ? commitIssues(parsed.data, index)
      : zodIssues(parsed.error.issues, ["companies", index]);
    const ticker = parsed.success ? parsed.data.identity.ticker : null;
    const externalId =
      parsed.success && parsed.data.externalId
        ? parsed.data.externalId
        : ticker
          ? `${batchSeed}:USA:${ticker}`
          : `invalid-item-${index + 1}`;
    if (seen.has(externalId)) {
      companyIssues.push({
        path: `$.companies[${index}].externalId`,
        message: "Company externalId must be unique within the batch.",
      });
    }
    seen.add(externalId);
    const normalized =
      parsed.success && companyIssues.length === 0
        ? normalizeCompany(parsed.data, externalId)
        : null;
    return {
      externalId,
      company: normalized,
      rawCompany,
      issues: companyIssues,
    };
  });

  return {
    success: true,
    data: {
      schemaVersion: "1.0",
      exportType: "usa_opportunity_monitoring",
      externalId: envelope.data.externalId ?? null,
      generatedAt: envelope.data.generatedAt ?? null,
      analysisDate: envelope.data.analysisDate,
      market: "USA",
      companies,
      rawPayload: json.value,
    },
  };
}

export function parseUsaMonitoringImport(
  payload: string,
): { success: true; data: UsaImportPayload } | ParseFailure {
  const json = parseJsonPayload(payload);
  if (!json.success) return json;
  const envelope = envelopeSchema.safeParse(json.value);
  const issues = envelope.success ? [] : zodIssues(envelope.error.issues);
  validateSafetyLimits(json.value, issues);
  if (envelope.success) {
    envelope.data.companies.forEach((company, index) => {
      const parsed = usaCompanySchema.safeParse(company);
      if (!parsed.success)
        issues.push(...zodIssues(parsed.error.issues, ["companies", index]));
    });
  }
  if (!envelope.success || issues.length > 0)
    return { success: false, category: "invalid_schema", issues };
  return { success: true, data: json.value as unknown as UsaImportPayload };
}
