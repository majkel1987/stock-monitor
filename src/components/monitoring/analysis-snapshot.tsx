import type { ReactNode } from "react";

import type { JsonValue } from "@/application/imports/gpw-monitoring-schema";
import type { MonitoringImportCompany } from "@/application/imports/types";
import { SectionHeader, StatusBadge, Surface } from "@/components/ui/terminal";

function title(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function hasContent(value: JsonValue): boolean {
  if (value === null || value === "") return false;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === "object") return Object.values(value).some(hasContent);
  return true;
}

function scalar(value: string | number | boolean) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function StructuredValue({
  value,
  depth = 0,
}: {
  value: JsonValue;
  depth?: number;
}) {
  if (!hasContent(value)) return null;
  if (value === null) return null;
  if (typeof value !== "object") {
    return <span>{scalar(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.filter(hasContent).map((item, index) => (
          <li className="flex gap-2" key={index}>
            <span className="text-[var(--accent-primary)]">•</span>
            <div className="min-w-0 flex-1">
              <StructuredValue depth={depth + 1} value={item} />
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <dl className={depth === 0 ? "grid gap-2 md:grid-cols-2" : "space-y-1.5"}>
      {Object.entries(value)
        .filter(([, item]) => hasContent(item))
        .map(([key, item]) => (
          <div
            className="rounded-[4px] border-b border-[var(--border-subtle)] py-1.5"
            key={key}
          >
            <dt className="text-[8px] font-bold tracking-[0.45px] text-[var(--text-muted)] uppercase">
              {title(key)}
            </dt>
            <dd className="mt-1 text-[10px] leading-[1.45] text-[var(--text-secondary)]">
              <StructuredValue depth={depth + 1} value={item} />
            </dd>
          </div>
        ))}
    </dl>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <Surface className="flex min-h-[72px] flex-col gap-1 px-3 py-[10px]">
      <span className="text-[8px] font-bold tracking-[0.5px] text-[var(--text-muted)]">
        {label}
      </span>
      <strong className={`font-mono text-[15px] ${tone ?? ""}`}>{value}</strong>
    </Surface>
  );
}

function AnalysisSection({
  title: sectionTitle,
  value,
  meta,
}: {
  title: string;
  value: JsonValue;
  meta?: ReactNode;
}) {
  if (!hasContent(value)) return null;
  return (
    <Surface>
      <SectionHeader meta={meta} title={sectionTitle} />
      <div className="p-3">
        <StructuredValue value={value} />
      </div>
    </Surface>
  );
}

function safeHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function AnalysisSnapshot({
  company,
}: {
  company: MonitoringImportCompany;
}) {
  const zone = company.valuation.attractiveEntryZone;
  const sections: Array<[string, JsonValue]> = [
    ["Narrative → Numbers", company.narrativeToNumbers ?? null],
    ["Business Quality", company.businessQuality ?? null],
    ["Financial Quality", company.financialQuality ?? null],
    ["Management & Ownership", company.managementAndOwnership ?? null],
    ["Dividend", company.dividend ?? null],
    ["Timing", company.timing ?? null],
    ["Supply Anomaly", company.supplyAnomaly ?? null],
    ["Small / Mid Cap Risk", company.smallMidCapRisk ?? null],
    ["Risk Assessment", company.riskAssessment ?? null],
    ["Position Plan / Tranches", company.positionPlan],
    ["What to Monitor / Next Review", company.monitoringPlan],
  ];
  const sources = Array.isArray(company.sources) ? company.sources : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Metric
          label="DECISION"
          tone="text-[var(--warning)]"
          value={company.decision.action.replaceAll("_", " ")}
        />
        <Metric
          label="INVESTMENT SCORE"
          tone="text-[var(--accent-primary)]"
          value={company.score.total ?? "—"}
        />
        <Metric
          label="BASE FAIR VALUE"
          tone="text-[var(--positive)]"
          value={
            company.valuation.fairValueBase === null
              ? "—"
              : `${company.valuation.fairValueBase} ${company.identity.currency}`
          }
        />
        <Metric
          label="ENTRY ZONE"
          value={
            zone.from === null && zone.to === null
              ? "—"
              : `${zone.from ?? "—"}–${zone.to ?? "—"} ${zone.currency}`
          }
        />
        <Metric
          label="BASE POTENTIAL"
          tone="text-[var(--positive)]"
          value={
            company.expectedReturn.baseTotalReturnPct === null
              ? "—"
              : `${company.expectedReturn.baseTotalReturnPct}%`
          }
        />
        <Metric
          label="ASYMMETRY"
          value={
            company.expectedReturn.asymmetryRatio === null
              ? "—"
              : `${company.expectedReturn.asymmetryRatio}×`
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[510px_1fr]">
        <Surface>
          <SectionHeader
            meta={`${company.score.total ?? "—"} / 100`}
            title="Score breakdown"
          />
          <dl className="grid grid-cols-2 gap-x-4 p-3">
            {Object.entries(company.score.components).map(([key, value]) => (
              <div
                className="flex justify-between border-b border-[var(--border-subtle)] py-2"
                key={key}
              >
                <dt className="pr-2 text-[9px] text-[var(--text-secondary)]">
                  {title(key)}
                </dt>
                <dd className="font-mono text-[10px] font-semibold">
                  {value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>
        <Surface>
          <SectionHeader
            meta={company.classification.opportunityCategory ?? undefined}
            title="Investment thesis"
          />
          <div className="space-y-3 p-3 text-[10px] leading-[1.45] text-[var(--text-secondary)]">
            {company.thesis.summary ? <p>{company.thesis.summary}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <StructuredValue
                value={{
                  growthDrivers: company.thesis.growthDrivers,
                  catalysts: company.thesis.catalysts,
                  pros: company.thesis.pros,
                }}
              />
              <StructuredValue
                value={{
                  risks: company.thesis.risks,
                  epsFcfGrowthDrivers: company.thesis.epsFcfGrowthDrivers,
                }}
              />
            </div>
            {hasContent(company.thesis.killCriteria) ? (
              <div className="rounded-[5px] border-l-[3px] border-[var(--negative)] bg-[var(--negative-subtle)] p-3">
                <strong className="text-[9px] text-[var(--negative)]">
                  KILL THE THESIS
                </strong>
                <div className="mt-2">
                  <StructuredValue value={company.thesis.killCriteria} />
                </div>
              </div>
            ) : null}
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalysisSection title="Valuation" value={company.valuation} />
        <AnalysisSection title="Bear / Base / Bull" value={company.scenarios} />
        <AnalysisSection
          title="Expected Return / Asymmetry"
          value={company.expectedReturn}
        />
        {sections.map(([sectionTitle, value]) => (
          <AnalysisSection
            key={sectionTitle}
            title={sectionTitle}
            value={value}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {sources.length ? (
          <Surface>
            <SectionHeader
              meta={`${sources.length} source(s)`}
              title="Sources"
            />
            <ul className="divide-y divide-[var(--border-subtle)] px-3">
              {sources.map((source, index) => {
                if (
                  typeof source !== "object" ||
                  source === null ||
                  Array.isArray(source)
                )
                  return null;
                const url = safeHttpUrl(source.url);
                const content = (
                  <>
                    <strong className="text-[10px] text-[var(--text-primary)]">
                      {typeof source.title === "string"
                        ? source.title
                        : `Source ${index + 1}`}
                    </strong>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {typeof source.publisher === "string"
                        ? source.publisher
                        : "Unknown publisher"}
                    </span>
                  </>
                );
                return (
                  <li className="py-2" key={index}>
                    {url ? (
                      <a
                        className="flex flex-col hover:text-[var(--accent-primary)]"
                        href={url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {content}
                      </a>
                    ) : (
                      <span className="flex flex-col">{content}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Surface>
        ) : null}
        <Surface>
          <SectionHeader title="Data quality" />
          <div className="space-y-3 p-3">
            <StatusBadge
              tone={
                company.dataQuality.confidence === "LOW"
                  ? "warning"
                  : "positive"
              }
            >
              {company.dataQuality.confidence} CONFIDENCE
            </StatusBadge>
            <StructuredValue value={company.dataQuality} />
          </div>
        </Surface>
      </div>
    </div>
  );
}
