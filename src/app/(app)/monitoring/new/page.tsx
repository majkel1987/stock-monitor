import { ArrowRight } from "lucide-react";

import {
  ActionButton,
  controlClass,
  Field,
  PageHeader,
  Surface,
  textareaClass,
} from "@/components/ui/terminal";

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
    <Surface className={`flex flex-col gap-[10px] p-[14px] ${className ?? ""}`}>
      <h2 className="text-xs leading-4 font-semibold">{title}</h2>
      {children}
    </Surface>
  );
}

function TextControl({ value }: { value: string }) {
  return <input className={controlClass} defaultValue={value} />;
}

function TextArea({ value }: { value: string }) {
  return <textarea className={textareaClass} defaultValue={value} />;
}

const scoreFields = [
  ["Investment", "78"],
  ["Quality", "84"],
  ["Valuation", "72"],
  ["Momentum", "61"],
  ["Risk", "34"],
  ["Safety", "76"],
] as const;

const comparison = [
  ["STATUS", "Wait", "Deep Dive", "text-[var(--accent-primary)]"],
  ["PRICE", "462.20", "475.00", "text-[var(--warning)]"],
  ["INVESTMENT SCORE", "74", "78", "text-[var(--positive)]"],
  ["QUALITY", "82", "84", "text-[var(--positive)]"],
  ["VALUATION", "76", "72", "text-[var(--negative)]"],
  ["MOMENTUM", "58", "61", "text-[var(--positive)]"],
  ["RISK", "31", "34", "text-[var(--negative)]"],
  ["SAFETY", "75", "76", "text-[var(--positive)]"],
] as const;

export default function NewMonitoringPage() {
  return (
    <div className="flex min-h-[1048px] flex-col gap-4 p-6">
      <PageHeader
        compact
        description="This record becomes part of the permanent analytical history."
        title="New monitoring · EMCOR Group"
      >
        <ActionButton variant="ghost">Cancel</ActionButton>
        <ActionButton
          className="w-[118px]"
          form="monitoring-form"
          type="submit"
          variant="primary"
        >
          Save monitoring
        </ActionButton>
      </PageHeader>

      <form
        className="grid h-[930px] grid-cols-[minmax(700px,850px)_318px] gap-4"
        id="monitoring-form"
      >
        <div className="flex flex-col gap-3">
          <FormSection className="h-[107px]" title="Analysis metadata">
            <div className="grid grid-cols-5 gap-[10px]">
              <Field label="Analyzed at">
                <TextControl value="01 Sep 2026 · 20:30" />
              </Field>
              <Field label="Current price">
                <TextControl value="475.00" />
              </Field>
              <Field label="Currency">
                <select className={controlClass} defaultValue="USD">
                  <option>USD</option>
                </select>
              </Field>
              <Field label="Price as of">
                <TextControl value="01 Sep · 16:42 CET" />
              </Field>
              <Field label="USD / PLN">
                <TextControl value="3.6924" />
              </Field>
            </div>
          </FormSection>

          <FormSection className="h-[129px]" title="Scores · 0–100">
            <div className="grid grid-cols-6 gap-[10px]">
              {scoreFields.map(([label, value]) => (
                <Field key={label} label={label}>
                  <input
                    className={controlClass}
                    defaultValue={value}
                    max="100"
                    min="0"
                    type="number"
                  />
                </Field>
              ))}
            </div>
            <p className="text-[9px] leading-3 text-[var(--text-muted)]">
              Empty means not analyzed. A numerical zero remains a valid score.
            </p>
          </FormSection>

          <FormSection className="h-[107px]" title="Classification">
            <div className="grid grid-cols-2 gap-[10px]">
              <Field label="Status">
                <select className={controlClass} defaultValue="Deep Dive">
                  <option>Deep Dive</option>
                  <option>Wait</option>
                  <option>Watch</option>
                </select>
              </Field>
              <Field label="Recommendation">
                <select
                  className={controlClass}
                  defaultValue="Accumulate on weakness"
                >
                  <option>Accumulate on weakness</option>
                  <option>Watch</option>
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection className="h-[149px]" title="Analysis">
            <div className="grid grid-cols-3 gap-[10px]">
              <Field label="Summary">
                <TextArea value="Backlog quality and execution remain strong; valuation requires disciplined entry." />
              </Field>
              <Field label="Pros">
                <TextArea value="Data-center exposure; record backlog; cash conversion; disciplined M&A." />
              </Field>
              <Field label="Risks">
                <TextArea value="Labor pressure; project concentration; capex cycle normalization." />
              </Field>
            </div>
          </FormSection>

          <FormSection className="h-[254px]" title="Thesis">
            <div className="grid grid-cols-2 gap-[10px]">
              <Field label="Thesis summary">
                <TextArea value="High-quality specialty contractor with durable execution advantages." />
              </Field>
              <Field label="Catalysts">
                <TextArea value="Backlog conversion; new awards; margin resilience." />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-[10px]">
              <Field label="Bull case">
                <TextArea value="Backlog converts above plan." />
              </Field>
              <Field label="Base case">
                <TextArea value="Mid-teens EPS growth persists." />
              </Field>
              <Field label="Bear case">
                <TextArea value="Margins normalize faster." />
              </Field>
              <Field label="Kill criteria">
                <TextArea value="Backlog down two quarters and margin < 6.5%." />
              </Field>
            </div>
          </FormSection>
        </div>

        <Surface className="h-[930px]">
          <header className="flex h-[60px] flex-col gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-[14px]">
            <h2 className="text-xs leading-4 font-semibold">Previous → new</h2>
            <span className="font-mono text-[9px] leading-3 text-[var(--text-muted)]">
              Previous record · 28 Aug 2026
            </span>
          </header>
          {comparison.map(([label, previous, next, tone]) => (
            <div
              className="flex h-[51px] flex-col gap-[5px] border-b border-[var(--border-subtle)] px-[14px] py-[10px]"
              key={label}
            >
              <span className="text-[9px] leading-3 font-semibold text-[var(--text-muted)]">
                {label}
              </span>
              <div className="grid grid-cols-[1fr_12px_1fr] items-center gap-2 font-mono text-[11px] leading-[14px]">
                <span className="text-[var(--text-secondary)]">{previous}</span>
                <ArrowRight className="size-3 text-[var(--text-muted)]" />
                <strong className={tone}>{next}</strong>
              </div>
            </div>
          ))}
          <aside className="flex h-[72px] flex-col gap-1.5 bg-[var(--accent-subtle)] p-[14px]">
            <strong className="text-[9px] leading-3 text-[var(--accent-primary)]">
              HISTORICAL RECORD
            </strong>
            <p className="text-[10px] leading-[13px] text-[var(--text-secondary)]">
              Saving creates a new immutable monitoring entry. The previous
              analysis remains available.
            </p>
          </aside>
        </Surface>
      </form>
    </div>
  );
}
