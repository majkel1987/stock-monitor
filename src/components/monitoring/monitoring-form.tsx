"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { createMonitoringAction } from "@/app/(app)/monitoring/new/actions";
import { idleResearchActionState } from "@/application/research/action-state";
import type {
  MonitoringHistoryItem,
  ResearchStatus,
  ThesisSummary,
} from "@/application/stocks/research-types";
import type { LatestUsdPlnRate } from "@/application/sync/get-latest-fx-rate";
import {
  ActionButton,
  controlClass,
  Field,
  PageHeader,
  SectionHeader,
  Surface,
  textareaClass,
} from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

type ScoreName =
  | "investmentScore"
  | "qualityScore"
  | "valuationScore"
  | "momentumScore"
  | "riskScore";

const scoreDefinitions: Array<{
  name: ScoreName;
  label: string;
  previousKey: keyof MonitoringHistoryItem["scores"];
}> = [
  { name: "investmentScore", label: "Investment", previousKey: "investment" },
  { name: "qualityScore", label: "Quality", previousKey: "quality" },
  { name: "valuationScore", label: "Valuation", previousKey: "valuation" },
  { name: "momentumScore", label: "Momentum", previousKey: "momentum" },
  { name: "riskScore", label: "Risk Safety", previousKey: "riskSafety" },
];

function localInputValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function localValueToIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("flex flex-col gap-3 p-4", className)}>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </Surface>
  );
}

function arrayText(items: string[]) {
  return items.join("; ");
}

function nullableValue(value: number | null) {
  return value === null ? "" : String(value);
}

function ComparisonRow({
  label,
  previous,
  current,
}: {
  label: string;
  previous: string;
  current: string;
}) {
  const before = Number(previous);
  const after = Number(current);
  const numeric =
    previous !== "—" &&
    current !== "—" &&
    Number.isFinite(before) &&
    Number.isFinite(after);
  const tone = numeric
    ? after > before
      ? "text-positive"
      : after < before
        ? "text-negative"
        : "text-muted-foreground"
    : previous === current
      ? "text-muted-foreground"
      : "text-primary";

  return (
    <div className="flex flex-col gap-1.5 border-b border-[var(--border-subtle)] px-4 py-3">
      <span className="ui-meta font-semibold tracking-wide uppercase">
        {label}
      </span>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-mono text-sm">
        <span className="truncate text-secondary-foreground">{previous}</span>
        <ArrowRight aria-hidden="true" className="size-3.5 text-muted-foreground" />
        <strong className={cn("truncate", tone)}>{current || "—"}</strong>
      </div>
    </div>
  );
}

export function MonitoringForm({
  stock,
  statuses,
  currentStatus,
  fxRate,
  quote,
  previous,
  thesis,
  supersedesId,
  initialNow,
}: {
  stock: {
    id: string;
    ticker: string;
    name: string;
    marketCode: "GPW" | "USA";
    currency: "PLN" | "USD";
  };
  statuses: ResearchStatus[];
  currentStatus: ResearchStatus;
  fxRate: LatestUsdPlnRate | null;
  quote: { price: string; asOf: string } | null;
  previous: MonitoringHistoryItem | null;
  thesis: ThesisSummary | null;
  supersedesId: string | null;
  initialNow: string;
}) {
  const [state, action, pending] = useActionState(
    createMonitoringAction,
    idleResearchActionState,
  );
  const [analyzedAt, setAnalyzedAt] = useState(() =>
    localInputValue(initialNow),
  );
  const [priceAsOf, setPriceAsOf] = useState(() =>
    localInputValue(quote?.asOf ?? initialNow),
  );
  const [statusId, setStatusId] = useState(currentStatus.id);
  const [price, setPrice] = useState(quote?.price ?? "");
  const [scores, setScores] = useState<Record<ScoreName, string>>({
    investmentScore: nullableValue(previous?.scores.investment ?? null),
    qualityScore: nullableValue(previous?.scores.quality ?? null),
    valuationScore: nullableValue(previous?.scores.valuation ?? null),
    momentumScore: nullableValue(previous?.scores.momentum ?? null),
    riskScore: nullableValue(previous?.scores.riskSafety ?? null),
  });
  const selectedStatus =
    statuses.find((status) => status.id === statusId) ?? currentStatus;
  const stockPath = `/stocks/${stock.marketCode.toLowerCase()}/${encodeURIComponent(stock.ticker)}`;

  return (
    <div className="page-frame flex flex-col gap-5">
      <PageHeader
        compact
        description="This record becomes part of the permanent analytical history."
        title={`New monitoring · ${stock.name}`}
      >
        <Link href={stockPath}>
          <ActionButton variant="ghost">Cancel</ActionButton>
        </Link>
        <ActionButton
          disabled={pending}
          form="monitoring-form"
          type="submit"
          variant="primary"
        >
          {pending ? "Saving…" : "Save monitoring"}
        </ActionButton>
      </PageHeader>

      <form
        action={action}
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"
        id="monitoring-form"
      >
        <input name="stockId" type="hidden" value={stock.id} />
        <input name="marketCode" type="hidden" value={stock.marketCode} />
        <input name="ticker" type="hidden" value={stock.ticker} />
        <input name="currency" type="hidden" value={stock.currency} />
        <input
          name="analyzedAt"
          type="hidden"
          value={localValueToIso(analyzedAt)}
        />
        <input
          name="priceAsOf"
          type="hidden"
          value={localValueToIso(priceAsOf)}
        />
        <input name="sourceReference" type="hidden" value="" />
        <input name="supersedesId" type="hidden" value={supersedesId ?? ""} />

        <div className="flex min-w-0 flex-col gap-3">
          <FormSection title="Analysis metadata">
            <div
              className={cn(
                "grid gap-3",
                stock.currency === "USD"
                  ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                  : "sm:grid-cols-2 lg:grid-cols-4",
              )}
            >
              <Field label="Analyzed at">
                <input
                  className={controlClass}
                  onChange={(event) => setAnalyzedAt(event.target.value)}
                  required
                  type="datetime-local"
                  value={analyzedAt}
                />
              </Field>
              <Field label="Current price">
                <input
                  className={controlClass}
                  min="0.000001"
                  name="price"
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Enter price"
                  required
                  step="0.000001"
                  type="number"
                  value={price}
                />
              </Field>
              <Field label="Currency">
                <input
                  className={controlClass}
                  disabled
                  value={stock.currency}
                />
              </Field>
              <Field label="Price as of">
                <input
                  className={controlClass}
                  onChange={(event) => setPriceAsOf(event.target.value)}
                  required
                  type="datetime-local"
                  value={priceAsOf}
                />
              </Field>
              {stock.currency === "USD" ? (
                <Field label="USD / PLN">
                  <input
                    className={controlClass}
                    defaultValue={fxRate?.rate ?? ""}
                    min="0.000001"
                    name="fxUsdPln"
                    placeholder="Manual fallback"
                    step="0.000001"
                    type="number"
                  />
                  <span className="ui-meta">
                    {fxRate
                      ? `NBP reference · effective ${fxRate.effectiveDate}`
                      : "No stored NBP reference · enter manually"}
                  </span>
                </Field>
              ) : (
                <input name="fxUsdPln" type="hidden" value="" />
              )}
            </div>
          </FormSection>

          <FormSection title="Scores · 0–100">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {scoreDefinitions.map((definition) => (
                <Field key={definition.name} label={definition.label}>
                  <input
                    className={controlClass}
                    max="100"
                    min="0"
                    name={definition.name}
                    onChange={(event) =>
                      setScores((current) => ({
                        ...current,
                        [definition.name]: event.target.value,
                      }))
                    }
                    step="1"
                    type="number"
                    value={scores[definition.name]}
                  />
                </Field>
              ))}
            </div>
            <p className="ui-meta">
              Empty means not analyzed. A numerical zero remains a valid score.
            </p>
          </FormSection>

          <FormSection title="Classification">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className={controlClass}
                  name="statusDefinitionId"
                  onChange={(event) => setStatusId(event.target.value)}
                  value={statusId}
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Recommendation">
                <input
                  className={controlClass}
                  defaultValue={previous?.recommendation ?? ""}
                  maxLength={160}
                  name="recommendation"
                  placeholder="Optional recommendation"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Analysis">
            <div className="grid gap-3 lg:grid-cols-3">
              <Field label="Summary">
                <textarea
                  className={textareaClass}
                  defaultValue={previous?.summary ?? ""}
                  maxLength={5_000}
                  name="summary"
                />
              </Field>
              <Field label="Pros">
                <textarea
                  className={textareaClass}
                  defaultValue={arrayText(previous?.pros ?? [])}
                  maxLength={5_000}
                  name="pros"
                  placeholder="Separate items with semicolons"
                />
              </Field>
              <Field label="Risks">
                <textarea
                  className={textareaClass}
                  defaultValue={arrayText(
                    previous?.risks ?? thesis?.keyRisks ?? [],
                  )}
                  maxLength={5_000}
                  name="risks"
                  placeholder="Separate items with semicolons"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Thesis">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Thesis summary">
                <textarea
                  className={textareaClass}
                  defaultValue={thesis?.summary ?? ""}
                  maxLength={5_000}
                  name="thesisSummary"
                />
              </Field>
              <Field label="Catalysts">
                <textarea
                  className={textareaClass}
                  defaultValue={arrayText(thesis?.catalysts ?? [])}
                  maxLength={5_000}
                  name="catalysts"
                  placeholder="Separate items with semicolons"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Bull case">
                <textarea
                  className={textareaClass}
                  defaultValue={thesis?.bullCase ?? ""}
                  maxLength={5_000}
                  name="bullCase"
                />
              </Field>
              <Field label="Base case">
                <textarea
                  className={textareaClass}
                  defaultValue={thesis?.baseCase ?? ""}
                  maxLength={5_000}
                  name="baseCase"
                />
              </Field>
              <Field label="Bear case">
                <textarea
                  className={textareaClass}
                  defaultValue={thesis?.bearCase ?? ""}
                  maxLength={5_000}
                  name="bearCase"
                />
              </Field>
              <Field label="Kill criteria">
                <textarea
                  className={textareaClass}
                  defaultValue={arrayText(thesis?.killCriteria ?? [])}
                  maxLength={5_000}
                  name="killCriteria"
                  placeholder="Separate items with semicolons"
                />
              </Field>
            </div>
          </FormSection>

          {state.message ? (
            <p
              className="rounded-[var(--radius-md)] border border-negative bg-[var(--negative-subtle)] px-3 py-2 text-sm text-negative"
              role="alert"
            >
              {state.message}
            </p>
          ) : null}
        </div>

        <Surface className="min-h-[20rem] self-start">
          <SectionHeader
            meta={
              previous
                ? `Previous · ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Europe/Warsaw" }).format(new Date(previous.analyzedAt))}`
                : "No previous monitoring"
            }
            title="Previous → new"
          />
          <ComparisonRow
            current={selectedStatus.label}
            label="STATUS"
            previous={previous?.status.label ?? "—"}
          />
          <ComparisonRow
            current={price || "—"}
            label="PRICE"
            previous={previous?.price ?? "—"}
          />
          {scoreDefinitions.map((definition) => (
            <ComparisonRow
              current={scores[definition.name] || "—"}
              key={definition.name}
              label={definition.label.toUpperCase()}
              previous={
                previous?.scores[definition.previousKey] === null || !previous
                  ? "—"
                  : String(previous.scores[definition.previousKey])
              }
            />
          ))}
          <aside className="flex flex-col gap-1.5 border-t border-[var(--border-subtle)] bg-[var(--accent-subtle)] p-4">
            <strong className="ui-eyebrow">Historical record</strong>
            <p className="text-sm leading-relaxed text-secondary-foreground">
              Saving creates a new immutable monitoring entry. The previous
              analysis remains available.
            </p>
          </aside>
        </Surface>
      </form>
    </div>
  );
}
