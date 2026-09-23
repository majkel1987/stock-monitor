import type { ThesisSummary } from "@/application/stocks/research-types";
import { SectionHeader, Surface } from "@/components/ui/terminal";
import { cn } from "@/lib/utils/cn";

import { emptyValue } from "./format";

function ScenarioCase({
  title,
  body,
  accent,
}: {
  title: string;
  body: string | null;
  accent: string;
}) {
  return (
    <div className={cn("min-w-0 border-l-2 pl-3", accent)}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p
        className={cn(
          "mt-1.5 text-sm leading-relaxed break-words",
          body ? "text-secondary-foreground" : "text-muted-foreground",
        )}
      >
        {body || emptyValue}
      </p>
    </div>
  );
}

function BulletList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length ? (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-secondary-foreground">
          {items.map((item, index) => (
            <li className="break-words" key={`${item}-${index}`}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export function InvestmentThesisCard({
  thesis,
}: {
  thesis: ThesisSummary | null;
}) {
  return (
    <Surface>
      <SectionHeader title="Investment thesis" />
      {thesis ? (
        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <p className="max-w-[65ch] text-base leading-relaxed break-words text-secondary-foreground">
            {thesis.summary ?? "No thesis summary recorded."}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ScenarioCase
              accent="border-positive"
              body={thesis.bullCase}
              title="Bull case"
            />
            <ScenarioCase
              accent="border-border"
              body={thesis.baseCase}
              title="Base case"
            />
            <ScenarioCase
              accent="border-negative"
              body={thesis.bearCase}
              title="Bear case"
            />
          </div>
          <BulletList
            emptyLabel="No catalysts recorded."
            items={thesis.catalysts}
            title="Catalysts"
          />
        </div>
      ) : (
        <p className="p-4 text-sm leading-relaxed text-muted-foreground sm:p-5">
          No thesis yet.
        </p>
      )}
    </Surface>
  );
}

export function KeyRisksCard({
  thesis,
  className,
}: {
  thesis: ThesisSummary | null;
  className?: string;
}) {
  return (
    <Surface className={cn(className)}>
      <SectionHeader title="Key risks" />
      {thesis?.keyRisks.length ? (
        <ul className="list-disc space-y-1.5 p-4 pl-9 text-sm leading-relaxed text-secondary-foreground sm:p-5 sm:pl-10">
          {thesis.keyRisks.map((item, index) => (
            <li className="break-words" key={`${item}-${index}`}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-sm leading-relaxed text-muted-foreground sm:p-5">
          {thesis ? "No key risks recorded." : "No thesis yet."}
        </p>
      )}
    </Surface>
  );
}

export function KillTheThesisCard({
  thesis,
  className,
}: {
  thesis: ThesisSummary | null;
  className?: string;
}) {
  const items = thesis?.killCriteria ?? [];

  return (
    <Surface
      className={cn("border-destructive/40", className)}
    >
      <SectionHeader
        className="bg-[var(--negative-subtle)]/40"
        title="Kill the Thesis"
      />
      <div className="p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Conditions that would invalidate the investment thesis.
        </p>
        {items.length ? (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-secondary-foreground">
            {items.map((item, index) => (
              <li className="break-words" key={`${item}-${index}`}>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {thesis
              ? "No Kill the Thesis conditions defined."
              : "No thesis yet."}
          </p>
        )}
      </div>
    </Surface>
  );
}
