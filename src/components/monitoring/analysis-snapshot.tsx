import type { ReactNode } from "react";

import type { JsonValue } from "@/application/imports/gpw-monitoring-schema";
import type { MonitoringImportCompany } from "@/application/imports/types";
import {
  MetricCard,
  SectionHeader,
  StatusBadge,
  Surface,
} from "@/components/ui/terminal";

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
            <span className="text-primary">•</span>
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
            className="border-b border-[var(--border-subtle)] py-2"
            key={key}
          >
            <dt className="ui-meta font-semibold tracking-wide uppercase">
              {title(key)}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-secondary-foreground">
              <StructuredValue depth={depth + 1} value={item} />
            </dd>
          </div>
        ))}
    </dl>
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
      <div className="p-4">
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Decision"
          tone="warning"
          value={company.decision.action.replaceAll("_", " ")}
        />
        <MetricCard
          label="Investment score"
          value={
            <span className="font-mono text-primary">
              {company.score.total ?? "—"}
            </span>
          }
        />
        <MetricCard
          label="Base fair value"
          tone="positive"
          value={
            company.valuation.fairValueBase === null
              ? "—"
              : `${company.valuation.fairValueBase} ${company.identity.currency}`
          }
        />
        <MetricCard
          label="Entry zone"
          value={
            zone.from === null && zone.to === null
              ? "—"
              : `${zone.from ?? "—"}–${zone.to ?? "—"} ${zone.currency}`
          }
        />
        <MetricCard
          label="Base potential"
          tone="positive"
          value={
            company.expectedReturn.baseTotalReturnPct === null
              ? "—"
              : `${company.expectedReturn.baseTotalReturnPct}%`
          }
        />
        <MetricCard
          label="Asymmetry"
          value={
            company.expectedReturn.asymmetryRatio === null
              ? "—"
              : `${company.expectedReturn.asymmetryRatio}×`
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <Surface>
          <SectionHeader
            meta={`${company.score.total ?? "—"} / 100`}
            title="Score breakdown"
          />
          <dl className="grid grid-cols-1 gap-x-4 p-4 sm:grid-cols-2">
            {Object.entries(company.score.components).map(([key, value]) => (
              <div
                className="flex justify-between gap-3 border-b border-[var(--border-subtle)] py-2"
                key={key}
              >
                <dt className="pr-2 text-sm text-secondary-foreground">
                  {title(key)}
                </dt>
                <dd className="font-mono text-sm font-semibold">
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
          <div className="space-y-3 p-4 text-sm leading-relaxed text-secondary-foreground">
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
              <div className="rounded-[var(--radius-md)] border border-negative/40 border-l-[3px] border-l-negative bg-[var(--negative-subtle)] p-3">
                <strong className="ui-meta text-negative">
                  Kill the thesis
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,20rem)]">
        {sources.length ? (
          <Surface>
            <SectionHeader
              meta={`${sources.length} source(s)`}
              title="Sources"
            />
            <ul className="divide-y divide-[var(--border-subtle)] px-4">
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
                    <strong className="text-sm text-foreground">
                      {typeof source.title === "string"
                        ? source.title
                        : `Source ${index + 1}`}
                    </strong>
                    <span className="ui-meta">
                      {typeof source.publisher === "string"
                        ? source.publisher
                        : "Unknown publisher"}
                    </span>
                  </>
                );
                return (
                  <li className="py-3" key={index}>
                    {url ? (
                      <a
                        className="flex flex-col hover:text-primary"
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
          <div className="space-y-3 p-4">
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
